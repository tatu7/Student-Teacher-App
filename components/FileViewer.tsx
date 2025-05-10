import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { downloadFile, openFile, getFileUrl } from "../lib/files";

export type FileViewerProps = {
	fileName: string;
	fileType: string;
	fileSize: number;
	filePath: string;
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

export default function FileViewer({
	fileName,
	fileType,
	fileSize,
	filePath,
}: FileViewerProps) {
	const [loading, setLoading] = useState<boolean>(false);
	const [downloadProgress, setDownloadProgress] = useState<number>(0);

	const handleDownloadFile = async () => {
		try {
			setLoading(true);

			// Get the signed URL
			const fileUrl = await getFileUrl(filePath);
			if (!fileUrl) {
				throw new Error("Could not generate download URL");
			}

			// Download the file
			const localFilePath = await downloadFile(fileUrl, fileName);

			// Open the file
			await openFile(localFilePath);

			setLoading(false);
		} catch (error: any) {
			setLoading(false);
			console.error("Error downloading file:", error);
			Alert.alert("Error", error.message || "Failed to download file");
		}
	};

	return (
		<TouchableOpacity
			style={styles.fileCard}
			onPress={handleDownloadFile}
			disabled={loading}>
			<View style={styles.fileInfo}>
				{getFileIcon(fileType)}
				<View style={styles.fileDetails}>
					<Text
						style={styles.fileName}
						numberOfLines={1}
						ellipsizeMode='middle'>
						{fileName}
					</Text>
					<Text style={styles.fileSize}>{formatFileSize(fileSize)}</Text>
				</View>
			</View>

			{loading ? (
				<View style={styles.actionButton}>
					<ActivityIndicator size='small' color='#3f51b5' />
				</View>
			) : (
				<View style={styles.actionButton}>
					<Ionicons name='download-outline' size={22} color='#3f51b5' />
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	fileCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "white",
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
	actionButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#EEF1FF",
		alignItems: "center",
		justifyContent: "center",
	},
});
