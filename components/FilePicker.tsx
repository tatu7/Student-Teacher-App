import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
	pickDocument,
	FileInfo,
	SUPPORTED_FILE_TYPES,
	MAX_FILE_SIZE,
} from "../lib/files";

type FilePickerProps = {
	onFilePicked: (file: FileInfo) => void;
	selectedFile?: FileInfo | null;
	buttonText?: string;
	loading?: boolean;
};

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (fileType: string): React.ReactNode => {
	if (fileType.includes("pdf")) {
		return <MaterialIcons name='picture-as-pdf' size={24} color='#e94335' />;
	}
	if (fileType.includes("word") || fileType.includes("document")) {
		return <MaterialIcons name='description' size={24} color='#4285f4' />;
	}
	return <MaterialIcons name='insert-drive-file' size={24} color='#34a853' />;
};

export default function FilePicker({
	onFilePicked,
	selectedFile,
	buttonText = "Select File",
	loading = false,
}: FilePickerProps) {
	const [error, setError] = useState<string | null>(null);

	const handlePickDocument = async () => {
		try {
			setError(null);
			const file = await pickDocument();

			if (!file) return; // User cancelled

			onFilePicked(file);
		} catch (err: any) {
			setError(err.message || "Failed to pick a document");
			Alert.alert("Error", err.message || "Failed to pick a document");
		}
	};

	const handleRemoveFile = () => {
		onFilePicked(null as any); // This will effectively clear the selection
	};

	const getSupportedFormatsText = () => {
		return "Supported formats: PDF, DOC, DOCX";
	};

	return (
		<View style={styles.container}>
			{!selectedFile ? (
				<TouchableOpacity
					style={styles.pickButton}
					onPress={handlePickDocument}
					disabled={loading}>
					{loading ? (
						<ActivityIndicator size='small' color='#fff' />
					) : (
						<>
							<Ionicons name='document-attach' size={20} color='#fff' />
							<Text style={styles.pickButtonText}>{buttonText}</Text>
						</>
					)}
				</TouchableOpacity>
			) : (
				<View style={styles.fileCard}>
					<View style={styles.fileInfo}>
						{getFileIcon(selectedFile.type)}
						<View style={styles.fileDetails}>
							<Text
								style={styles.fileName}
								numberOfLines={1}
								ellipsizeMode='middle'>
								{selectedFile.name}
							</Text>
							<Text style={styles.fileSize}>
								{formatFileSize(selectedFile.size)}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						style={styles.removeButton}
						onPress={handleRemoveFile}
						disabled={loading}>
						{loading ? (
							<ActivityIndicator size='small' color='#f44336' />
						) : (
							<Ionicons name='close-circle' size={24} color='#f44336' />
						)}
					</TouchableOpacity>
				</View>
			)}

			<Text style={styles.supportedFormats}>{getSupportedFormatsText()}</Text>
			{error && <Text style={styles.errorText}>{error}</Text>}

			<Text style={styles.sizeLimit}>
				Maximum size: {formatFileSize(MAX_FILE_SIZE)}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginVertical: 8,
	},
	pickButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#3f51b5",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 8,
	},
	pickButtonText: {
		color: "white",
		fontWeight: "600",
		marginLeft: 8,
	},
	fileCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "#f5f5f7",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		marginBottom: 8,
	},
	fileInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	fileDetails: {
		marginLeft: 12,
		flex: 1,
	},
	fileName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
	},
	fileSize: {
		fontSize: 12,
		color: "#666",
		marginTop: 2,
	},
	removeButton: {
		padding: 4,
	},
	supportedFormats: {
		fontSize: 12,
		color: "#666",
		marginBottom: 4,
	},
	errorText: {
		fontSize: 12,
		color: "#f44336",
		marginTop: 4,
	},
	sizeLimit: {
		fontSize: 12,
		color: "#666",
	},
});
