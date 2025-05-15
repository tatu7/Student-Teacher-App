import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	SafeAreaView,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Linking,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import {
	pickDocument,
	uploadSubmissionFile,
	FileInfo,
} from "../../../lib/files";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// Types
type Task = {
	id: string;
	title: string;
	description: string;
	due_date: string;
	status: "pending" | "completed" | "overdue";
	has_files?: boolean;
	file_info?: {
		name: string;
		path: string;
	} | null;
};

type Submission = {
	id: string;
	content: string;
	submitted_at: string;
	updated_at: string;
	feedback?: string;
	rating?: number;
	has_files?: boolean;
	file_info?: {
		name: string;
		path: string;
	} | null;
};

export default function TaskDetailsScreen() {
	const { id, name, groupId, groupName } = useLocalSearchParams<{
		id: string;
		name: string;
		groupId: string;
		groupName: string;
	}>();
	const { user } = useAuth();
	const [task, setTask] = useState<Task | null>(null);
	const [submission, setSubmission] = useState<Submission | null>(null);
	const [submissionContent, setSubmissionContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
	const [fileUploading, setFileUploading] = useState(false);

	useEffect(() => {
		fetchTaskDetails();
	}, [id]);

	const fetchTaskDetails = async () => {
		try {
			setLoading(true);

			if (!user || !id) return;

			// Fetch task details with file info
			const { data: taskData, error: taskError } = await supabase
				.from("tasks")
				.select(
					`
          id,
          title,
          description,
          due_date,
          has_files
        `
				)
				.eq("id", id)
				.single();

			if (taskError) throw taskError;

			// Fetch task file info if it has files
			let fileInfo = null;
			if (taskData.has_files) {
				const { data: fileData, error: fileError } = await supabase
					.from("task_files")
					.select("file_name, file_path")
					.eq("task_id", id)
					.maybeSingle();

				if (!fileError && fileData) {
					fileInfo = {
						name: fileData.file_name,
						path: fileData.file_path,
					};
				}
			}

			// Fetch existing submission by this student
			const { data: submissionData, error: submissionError } = await supabase
				.from("submissions")
				.select(
					`
          id,
          content,
          submitted_at,
          updated_at,
          feedback,
          rating,
          has_files,
          file_path,
          file_name,
          file_type,
          file_size
        `
				)
				.eq("task_id", id)
				.eq("student_id", user.id)
				.maybeSingle();

			if (submissionError && submissionError.code !== "PGRST116")
				throw submissionError;

			// Set submission file info from the submission record instead of separate table
			let submissionFileInfo = null;
			let hasSubmissionFiles = false;

			if (
				submissionData &&
				submissionData.has_files &&
				submissionData.file_path
			) {
				submissionFileInfo = {
					name: submissionData.file_name,
					path: submissionData.file_path,
				};
				hasSubmissionFiles = true;
			}

			if (taskData) {
				const isCompleted = !!submissionData;
				const isOverdue =
					new Date(taskData.due_date) < new Date() && !isCompleted;

				const status: "pending" | "completed" | "overdue" = isCompleted
					? "completed"
					: isOverdue
					? "overdue"
					: "pending";

				setTask({
					id: taskData.id,
					title: taskData.title,
					description: taskData.description || "",
					due_date: taskData.due_date,
					status,
					has_files: taskData.has_files,
					file_info: fileInfo,
				});

				if (submissionData) {
					setSubmission({
						...submissionData,
						has_files: hasSubmissionFiles,
						file_info: submissionFileInfo,
					});
					setSubmissionContent(submissionData.content || "");
				}
			}
		} catch (error) {
			console.error("Error fetching task details:", error);
			Alert.alert(
				"Xatolik",
				"Vazifa ma'lumotlarini yuklashda xatolik yuz berdi"
			);
		} finally {
			setLoading(false);
		}
	};

	const handlePickFile = async () => {
		try {
			const file = await pickDocument();
			if (file) {
				setSelectedFile(file);
			}
		} catch (error) {
			console.error("Error picking file:", error);
			Alert.alert("Xatolik", "Faylni tanlashda xatolik yuz berdi");
		}
	};

	const handleViewTaskFile = async () => {
		if (!task?.file_info?.path) return;

		try {
			// Get the full URL for the file
			const { data } = await supabase.storage
				.from("task_files")
				.getPublicUrl(task.file_info.path);

			if (data?.publicURL) {
				// Open the file in browser
				await Linking.openURL(data.publicURL);
			}
		} catch (error) {
			console.error("Error opening file:", error);
			Alert.alert("Xatolik", "Faylni ochishda xatolik yuz berdi");
		}
	};

	const handleDownloadTaskFile = async () => {
		if (!task?.file_info?.path) return;

		try {
			// Get the full URL for the file
			const { data } = await supabase.storage
				.from("task_files")
				.getPublicUrl(task.file_info.path);

			if (data?.publicURL) {
				if (Platform.OS === "ios") {
					// For iOS, opening the URL in Safari will allow download
					await Linking.openURL(data.publicURL);
				} else {
					// For Android, use FileSystem to download
					const fileName = task.file_info.name;
					const fileUri = FileSystem.documentDirectory + fileName;

					const downloadResumable = FileSystem.createDownloadResumable(
						data.publicURL,
						fileUri
					);

					const downloadResult = await downloadResumable.downloadAsync();

					if (downloadResult && downloadResult.uri) {
						await Sharing.shareAsync(downloadResult.uri);
					}
				}
			}
		} catch (error) {
			console.error("Error downloading file:", error);
			Alert.alert("Xatolik", "Faylni yuklab olishda xatolik yuz berdi");
		}
	};

	const handleSubmit = async () => {
		try {
			if (!user || !id) {
				Alert.alert(
					"Xatolik",
					"Foydalanuvchi yoki vazifa ma'lumotlari mavjud emas"
				);
				return;
			}

			setSubmitting(true);
			let submissionId = submission?.id;
			let filePath = null;

			if (submission) {
				// Update existing submission
				const { error } = await supabase
					.from("submissions")
					.update({
						content: submissionContent,
						updated_at: new Date().toISOString(),
					})
					.eq("id", submission.id);

				if (error) throw error;
			} else {
				// Create new submission
				const { data, error } = await supabase
					.from("submissions")
					.insert({
						task_id: id,
						student_id: user.id,
						content: submissionContent,
						submitted_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
					.select();

				if (error) throw error;
				submissionId = data[0].id;
			}

			// Upload file if selected
			if (selectedFile && submissionId) {
				setFileUploading(true);
				try {
					filePath = await uploadSubmissionFile(submissionId, selectedFile);

					if (filePath) {
						// Update the submission directly with file information instead of using submission_files table
						const { error: updateError } = await supabase
							.from("submissions")
							.update({
								file_path: filePath,
								file_name: selectedFile.name,
								file_type: selectedFile.type,
								file_size: selectedFile.size,
								has_files: true,
							})
							.eq("id", submissionId);

						if (updateError) {
							console.error(
								"Error updating submission with file info:",
								updateError
							);
							Alert.alert(
								"Ogohlantirish",
								`Javob saqlandi va fayl yuklandi, lekin fayl ma'lumotlarini saqlashda xatolik yuzaga keldi: ${
									updateError.message || "Noma'lum xatolik"
								}`
							);
						}
					}
				} catch (uploadError) {
					console.error("Error uploading file:", uploadError);
					Alert.alert(
						"Ogohlantirish",
						"Javob saqlandi, lekin faylni yuklashda muammo yuzaga keldi."
					);
				} finally {
					setFileUploading(false);
				}
			} else if (!selectedFile && submission?.file_info) {
				// If no new file selected but had a file before, preserve the existing file
				// No action needed here as we're not updating the submission_files record
			}

			// Refresh task details
			await fetchTaskDetails();
			setSelectedFile(null);

			Alert.alert(
				"Muvaffaqiyat",
				submission ? "Javobingiz yangilandi" : "Javobingiz yuborildi"
			);
		} catch (error) {
			console.error("Error submitting task:", error);
			Alert.alert("Xatolik", "Javobni yuborishda xatolik yuz berdi");
		} finally {
			setSubmitting(false);
		}
	};

	const canSubmit = () => {
		if (!task) return false;
		return task.status !== "overdue" || submission !== null;
	};

	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			const options: Intl.DateTimeFormatOptions = {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			};
			return date.toLocaleDateString("uz-UZ", options);
		} catch (e) {
			return dateString;
		}
	};

	const renderTaskFileSection = () => {
		if (!task?.has_files || !task?.file_info) return null;

		return (
			<View style={styles.fileSection}>
				<TouchableOpacity
					style={styles.fileButton}
					onPress={handleViewTaskFile}>
					<Text style={styles.fileButtonText}>Vazifa faylini ko'rish</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.fileButton, styles.downloadButton]}
					onPress={handleDownloadTaskFile}>
					<Text style={styles.fileButtonText}>Vazifa faylini yuklab olish</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderSubmissionSection = () => {
		if (!task) return null;

		const isOverdue = task.status === "overdue" && !submission;
		const isEditable = !isOverdue;

		return (
			<View style={styles.submissionSection}>
				<Text style={styles.sectionTitle}>Javob yuborish</Text>

				{isOverdue ? (
					<View style={styles.overdueBanner}>
						<Ionicons name='alert-circle' size={20} color='#f44336' />
						<Text style={styles.overdueText}>
							Vazifa muddati o&apos;tgan va endi topshirib bo&apos;lmaydi
						</Text>
					</View>
				) : null}

				<Text style={styles.inputLabel}>Javob tavsifi</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={[
							styles.submissionInput,
							!isEditable && styles.disabledInput,
						]}
						placeholder="Javobingiz haqida qisqacha ma'lumot bering"
						multiline
						value={submissionContent}
						onChangeText={setSubmissionContent}
						editable={isEditable}
					/>
				</View>

				{/* File upload section */}
				{isEditable && (
					<>
						{selectedFile ? (
							<View style={styles.selectedFileContainer}>
								<View style={styles.selectedFileInfo}>
									<Ionicons name='document-text' size={20} color='#4169E1' />
									<Text style={styles.selectedFileName} numberOfLines={1}>
										{selectedFile.name}
									</Text>
								</View>
								<TouchableOpacity
									style={styles.removeFileButton}
									onPress={() => setSelectedFile(null)}>
									<Ionicons name='close-circle' size={20} color='#FF3B30' />
								</TouchableOpacity>
							</View>
						) : submission?.file_info ? (
							<View style={styles.selectedFileContainer}>
								<View style={styles.selectedFileInfo}>
									<Ionicons name='document-text' size={20} color='#4169E1' />
									<Text style={styles.selectedFileName} numberOfLines={1}>
										{submission.file_info.name}
									</Text>
								</View>
								<TouchableOpacity
									style={styles.viewFileButton}
									onPress={async () => {
										if (submission?.file_info?.path) {
											const { data } = await supabase.storage
												.from("task_files")
												.getPublicUrl(submission.file_info.path);
											if (data?.publicURL) {
												await Linking.openURL(data.publicURL);
											}
										}
									}}>
									<Ionicons name='eye' size={20} color='#4169E1' />
								</TouchableOpacity>
							</View>
						) : (
							<TouchableOpacity
								style={styles.filePickerButton}
								onPress={handlePickFile}>
								<Ionicons
									name='cloud-upload-outline'
									size={20}
									color='#4169E1'
								/>
								<Text style={styles.filePickerText}>
									Javob faylini tanlang (PDF yoki DOCX)
								</Text>
							</TouchableOpacity>
						)}
					</>
				)}

				{submission ? (
					<View style={styles.submissionInfo}>
						<Text style={styles.submissionDate}>
							Yuborilgan:{" "}
							{new Date(submission.submitted_at).toLocaleString("uz-UZ")}
							{submission.updated_at !== submission.submitted_at
								? ` (Yangilangan: ${new Date(
										submission.updated_at
								  ).toLocaleString("uz-UZ")})`
								: ""}
						</Text>

						{submission.rating ? (
							<View style={styles.gradeContainer}>
								<Text style={styles.gradeLabel}>Baho:</Text>
								<Text style={styles.gradeValue}>{submission.rating}/100</Text>
							</View>
						) : null}

						{submission.feedback ? (
							<View style={styles.feedbackContainer}>
								<Text style={styles.feedbackLabel}>O'qituvchi izohi:</Text>
								<Text style={styles.feedbackContent}>
									{submission.feedback}
								</Text>
							</View>
						) : null}
					</View>
				) : null}

				{canSubmit() ? (
					<TouchableOpacity
						style={styles.submitButton}
						onPress={handleSubmit}
						disabled={
							submitting ||
							(!submissionContent.trim() &&
								!selectedFile &&
								!submission?.file_info)
						}>
						{submitting || fileUploading ? (
							<ActivityIndicator size='small' color='white' />
						) : (
							<>
								<FontAwesome
									name='paper-plane'
									size={16}
									color='white'
									style={styles.submitIcon}
								/>
								<Text style={styles.submitButtonText}>
									{submission ? "Javobni yangilash" : "Javob yuborish"}
								</Text>
							</>
						)}
					</TouchableOpacity>
				) : null}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Vazifa",
					headerTitleStyle: {
						fontWeight: "bold",
						color: "white",
					},
					headerStyle: {
						backgroundColor: "#4169E1",
					},
					headerTintColor: "white",
				}}
			/>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			) : (
				<KeyboardAvoidingView
					style={styles.keyboardAvoid}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					keyboardVerticalOffset={100}>
					<ScrollView contentContainerStyle={styles.scrollContent}>
						{task ? (
							<>
								<View style={styles.taskHeader}>
									<Text style={styles.taskTitle}>{task.title}</Text>

									<View style={styles.dateContainer}>
										<Ionicons name='calendar-outline' size={18} color='#666' />
										<Text style={styles.dateText}>
											Muddat: {formatDate(task.due_date)}
										</Text>
									</View>

									<Text style={styles.taskDescription}>
										{task.description || "No description provided."}
									</Text>
								</View>

								{renderTaskFileSection()}
								{renderSubmissionSection()}
							</>
						) : (
							<View style={styles.errorContainer}>
								<MaterialIcons name='error-outline' size={60} color='#ccc' />
								<Text style={styles.errorText}>Vazifa topilmadi</Text>
							</View>
						)}
					</ScrollView>
				</KeyboardAvoidingView>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
		marginTop: 24,
	},
	keyboardAvoid: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	taskHeader: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	taskTitle: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 12,
	},
	dateContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	dateText: {
		fontSize: 16,
		color: "#666",
		marginLeft: 8,
	},
	taskDescription: {
		fontSize: 16,
		color: "#444",
		lineHeight: 24,
	},
	fileSection: {
		marginBottom: 16,
	},
	fileButton: {
		backgroundColor: "#4169E1",
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 20,
		alignItems: "center",
		marginBottom: 12,
	},
	downloadButton: {
		backgroundColor: "#5C7CFA",
	},
	fileButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	submissionSection: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	overdueBanner: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#ffebee",
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	overdueText: {
		color: "#f44336",
		marginLeft: 8,
		flex: 1,
	},
	inputContainer: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		marginBottom: 16,
	},
	submissionInput: {
		minHeight: 120,
		padding: 12,
		fontSize: 16,
		color: "#333",
		textAlignVertical: "top",
	},
	disabledInput: {
		backgroundColor: "#f9f9f9",
		color: "#888",
	},
	filePickerButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#E8F0FE",
		borderRadius: 8,
		padding: 14,
		marginBottom: 16,
	},
	filePickerText: {
		color: "#4169E1",
		marginLeft: 10,
		fontSize: 16,
	},
	selectedFileContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "#E8F0FE",
		borderRadius: 8,
		padding: 14,
		marginBottom: 16,
	},
	selectedFileInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	selectedFileName: {
		color: "#333",
		marginLeft: 10,
		fontSize: 16,
		flex: 1,
	},
	removeFileButton: {
		padding: 5,
	},
	viewFileButton: {
		padding: 5,
	},
	submissionInfo: {
		marginBottom: 16,
	},
	submissionDate: {
		fontSize: 14,
		color: "#666",
		marginBottom: 8,
	},
	gradeContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	gradeLabel: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		marginRight: 8,
	},
	gradeValue: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#4caf50",
	},
	feedbackContainer: {
		backgroundColor: "#f5f5f5",
		borderRadius: 8,
		padding: 12,
		marginTop: 8,
	},
	feedbackLabel: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	feedbackContent: {
		fontSize: 14,
		color: "#555",
		lineHeight: 20,
	},
	submitButton: {
		backgroundColor: "#4169E1",
		borderRadius: 8,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 24,
	},
	submitIcon: {
		marginRight: 8,
	},
	submitButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		marginTop: 80,
	},
	errorText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
	},
});
