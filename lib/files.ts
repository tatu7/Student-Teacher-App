import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Linking } from 'react-native';

// Supported file types for task attachments
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',                                                     // PDF
  'application/msword',                                                  // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];

// Max file size - 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type FileInfo = {
  name: string;
  type: string;
  size: number;
  uri: string;
  extension?: string;
};

export type TaskFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  created_at: string;
};

/**
 * Pick a document from the device
 */
export const pickDocument = async (): Promise<FileInfo | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: SUPPORTED_FILE_TYPES,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    // Get file info
    const fileInfo = result.assets[0];
    if (!fileInfo) return null;

    // Validate file size
    const fileSize = fileInfo.size || 0;
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }

    // Extract extension from MIME type if not present in name
    const extension = fileInfo.name.includes('.')
      ? fileInfo.name.split('.').pop()
      : fileInfo.mimeType?.split('/').pop();

    return {
      name: fileInfo.name,
      type: fileInfo.mimeType || '',
      size: fileSize,
      uri: fileInfo.uri,
      extension: extension,
    };
  } catch (error) {
    console.error('Error picking document:', error);
    throw error;
  }
};

/**
 * Upload a file to Supabase Storage
 */
export const uploadTaskFile = async (
  taskId: string,
  file: FileInfo,
): Promise<string> => {
  try {
    // Create a unique filename
    const timestamp = new Date().getTime();
    const fileExtension = file.extension || file.name.split('.').pop() || '';
    const fileName = `task_${taskId}_${timestamp}.${fileExtension}`;
    const filePath = `${taskId}/${fileName}`;

    // Read the file as base64
    const base64Content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('task_files')
      .upload(filePath, decode(base64Content), {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Return the path to the uploaded file
    return data?.Key || filePath;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Function to decode base64
function decode(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get a public URL for a file in Supabase Storage
 */
export const getFileUrl = async (filePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from('task_files')
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      throw error;
    }

    return data?.signedURL || '';
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

/**
 * Download a file from Supabase Storage to device's cache
 */
export const downloadFile = async (fileUrl: string, fileName: string): Promise<string> => {
  try {
    // Determine the directory for storing the file
    const cacheDir = FileSystem.cacheDirectory || '';
    const localFilePath = `${cacheDir}${fileName}`;

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      fileUrl,
      localFilePath
    );

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download file with status: ${downloadResult.status}`);
    }

    return localFilePath;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Open a file with the device's default app
 */
export const openFile = async (localFilePath: string): Promise<void> => {
  try {
    // In a real app, you would use Expo's FileSystem.openAsync or a similar method
    // to open the file with the device's default app
    // This is a simplified implementation
    const fileInfo = await FileSystem.getInfoAsync(localFilePath);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // On web, you would use window.open
    if (Platform.OS === 'web') {
      window.open(localFilePath, '_blank');
      return;
    }

    // On native platforms, use Linking to open the file with the system default app
    await Linking.openURL(FileSystem.documentDirectory + localFilePath);
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
}; 