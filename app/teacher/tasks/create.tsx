import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	Modal,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { notifyTaskAssigned } from "../../../lib/notifications";
import { pickDocument, uploadTaskFile, FileInfo } from "../../../lib/files";
import FilePicker from "../../../components/FilePicker";

// Define types
type SelectedStudent = {
	id: string;
	email: string;
	selected: boolean;
};

export default function CreateTaskScreen() {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const groupId = params.groupId as string;
	const groupName = params.groupName as string;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [loading, setLoading] = useState(false);
	const [students, setStudents] = useState<SelectedStudent[]>([]);
	const [studentsLoading, setStudentsLoading] = useState(true);
	const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
	const [fileUploading, setFileUploading] = useState(false);

	useEffect(() => {
		fetchGroupStudents();
	}, []);

	const fetchGroupStudents = async () => {
		try {
			setStudentsLoading(true);

			// Add validation check for groupId
			if (!groupId || groupId === "undefined") {
				setStudents([]);
				Alert.alert(
					"Error",
					"No group selected. Please go back and select a group."
				);
				return;
			}

			// Get students from this group with their profiles
			const { data, error } = await supabase
				.from("group_students")
				.select(
					`
					id, 
					student_id,
					student_email,
					status
				`
				)
				.eq("group_id", groupId)
				.eq("status", "active"); // Only get active students

			if (error) throw error;

			// Transform data for UI
			const formattedStudents = data.map((student) => ({
				id: student.student_id,
				email: student.student_email,
				selected: true, // All students selected by default
			}));

			setStudents(formattedStudents);
		} catch (error) {
			console.error("Error fetching group students:", error);
			Alert.alert("Error", "Failed to load students");
		} finally {
			setStudentsLoading(false);
		}
	};

	const handleCreateTask = async () => {
		// Validate input
		if (!title.trim()) {
			Alert.alert("Error", "Please enter a task title");
			return;
		}

		if (!description.trim()) {
			Alert.alert("Error", "Please enter a task description");
			return;
		}

		// Get selected students (if any)
		const selectedStudents = students.filter((s) => s.selected);

		try {
			setLoading(true);

			// Create task in the database
			const { data: taskData, error: taskError } = await supabase
				.from("tasks")
				.insert({
					title,
					description,
					due_date: dueDate.toISOString(),
					group_id: groupId,
					teacher_id: user?.id,
					has_files: !!selectedFile, // Set has_files flag
				})
				.select()
				.single();

			if (taskError) throw taskError;

			// Upload file if one was selected
			let filePath = null;
			if (selectedFile) {
				setFileUploading(true);
				try {
					filePath = await uploadTaskFile(taskData.id, selectedFile);

					// Record file in task_files table
					if (filePath) {
						const { error: fileError } = await supabase
							.from("task_files")
							.insert({
								task_id: taskData.id,
								file_path: filePath,
								file_name: selectedFile.name,
								file_type: selectedFile.type,
								file_size: selectedFile.size,
							});

						if (fileError) {
							console.error("Error recording file:", fileError);
							// Continue even if there was an error recording the file
						}
					}
				} catch (uploadError) {
					console.error("Error uploading file:", uploadError);
					Alert.alert(
						"Warning",
						"Task was created but there was an issue uploading the file."
					);
				} finally {
					setFileUploading(false);
				}
			}

			// Send notifications to selected students (if any)
			if (selectedStudents.length > 0) {
				for (const student of selectedStudents) {
					if (student.id) {
						try {
							await notifyTaskAssigned({
								studentId: student.id,
								taskTitle: title,
								taskId: taskData.id,
							});
						} catch (notificationError) {
							console.error(
								`Failed to notify student ${student.email}:`,
								notificationError
							);
							// Continue with other students even if one notification fails
						}
					} else {
						console.warn(
							`Student ${student.email} has no ID, skipping notification`
						);
					}
				}
			}

			Alert.alert("Success", "Task created successfully", [
				{ text: "OK", onPress: () => router.back() },
			]);
		} catch (error) {
			console.error("Error creating task:", error);
			Alert.alert("Error", "Failed to create task");
		} finally {
			setLoading(false);
		}
	};

	const toggleStudent = (id: string) => {
		setStudents(
			students.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Create Task",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}>
				<ScrollView style={styles.scrollView}>
					<View style={styles.formContainer}>
						<Text style={styles.groupName}>Group: {groupName}</Text>

						<Text style={styles.label}>Title</Text>
						<TextInput
							style={styles.input}
							value={title}
							onChangeText={setTitle}
							placeholder='Enter task title'
							placeholderTextColor='#aaa'
						/>

						<Text style={styles.label}>Description</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							value={description}
							onChangeText={setDescription}
							placeholder='Enter task description'
							placeholderTextColor='#aaa'
							multiline
							numberOfLines={4}
							textAlignVertical='top'
						/>

						<Text style={styles.label}>Due Date</Text>
						<TouchableOpacity
							style={styles.datePickerButton}
							onPress={() => setShowDatePicker(true)}>
							<Text style={styles.dateText}>
								{dueDate.toLocaleDateString()}
							</Text>
							<Ionicons name='calendar' size={20} color='#3f51b5' />
						</TouchableOpacity>

						{showDatePicker && (
							<DateTimePicker
								value={dueDate}
								mode='date'
								display='default'
								onChange={(_, selectedDate) => {
									setShowDatePicker(false);
									if (selectedDate) {
										setDueDate(selectedDate);
									}
								}}
								minimumDate={new Date()}
							/>
						)}

						<Text style={styles.label}>Task Materials (Optional)</Text>
						<FilePicker
							onFilePicked={setSelectedFile}
							selectedFile={selectedFile}
							buttonText='Attach Document'
							loading={fileUploading}
						/>

						<Text style={styles.label}>Assign to Students (Optional)</Text>
						{studentsLoading ? (
							<ActivityIndicator size='small' color='#3f51b5' />
						) : (
							<View style={styles.studentsContainer}>
								{students.length === 0 ? (
									<Text style={styles.noStudentsText}>
										No students in this group
									</Text>
								) : (
									<>
										<Text style={styles.helperText}>
											Students are optional. You can create a task without
											assigning it to any students.
										</Text>
										{students.map((student) => (
											<TouchableOpacity
												key={student.id || student.email}
												style={[
													styles.studentItem,
													student.selected && styles.studentItemSelected,
												]}
												onPress={() => toggleStudent(student.id)}>
												<Text
													style={[
														styles.studentEmail,
														student.selected && styles.studentEmailSelected,
													]}>
													{student.email}
												</Text>
												{student.selected && (
													<Ionicons
														name='checkmark-circle'
														size={20}
														color='white'
													/>
												)}
											</TouchableOpacity>
										))}
									</>
								)}
							</View>
						)}

						<TouchableOpacity
							style={[styles.createButton, loading && styles.disabledButton]}
							onPress={handleCreateTask}
							disabled={loading || fileUploading}>
							{loading ? (
								<ActivityIndicator size='small' color='white' />
							) : (
								<Text style={styles.createButtonText}>Create Task</Text>
							)}
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	scrollView: {
		flex: 1,
	},
	formContainer: {
		padding: 16,
	},
	groupName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#3f51b5",
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		color: "#333",
	},
	input: {
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		fontSize: 16,
		marginBottom: 16,
	},
	textArea: {
		minHeight: 100,
	},
	datePickerButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		marginBottom: 16,
	},
	dateText: {
		fontSize: 16,
		color: "#333",
	},
	studentsContainer: {
		marginBottom: 20,
	},
	studentItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 12,
		backgroundColor: "white",
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	studentItemSelected: {
		backgroundColor: "#3f51b5",
		borderColor: "#3f51b5",
	},
	studentEmail: {
		fontSize: 15,
		color: "#333",
	},
	studentEmailSelected: {
		color: "white",
	},
	noStudentsText: {
		textAlign: "center",
		marginTop: 10,
		color: "#666",
	},
	helperText: {
		fontSize: 14,
		color: "#666",
		marginBottom: 10,
		fontStyle: "italic",
	},
	createButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	createButtonText: {
		color: "white",
		fontSize: 17,
		fontWeight: "600",
	},
	disabledButton: {
		opacity: 0.7,
	},
});
