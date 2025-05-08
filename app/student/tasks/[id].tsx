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
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Task = {
	id: string;
	title: string;
	description: string;
	due_date: string;
	status: "pending" | "completed" | "overdue";
};

type Submission = {
	id: string;
	content: string;
	created_at: string;
	updated_at: string;
	feedback?: string;
	grade?: number;
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

	useEffect(() => {
		fetchTaskDetails();
	}, [id]);

	const fetchTaskDetails = async () => {
		try {
			setLoading(true);

			if (!user || !id) return;

			// Fetch task details
			const { data: taskData, error: taskError } = await supabase
				.from("tasks")
				.select(
					`
          id,
          title,
          description,
          due_date
        `
				)
				.eq("id", id)
				.single();

			if (taskError) throw taskError;

			// Fetch existing submission by this student
			const { data: submissionData, error: submissionError } = await supabase
				.from("submissions")
				.select(
					`
          id,
          content,
          created_at,
          updated_at,
          feedback,
          grade
        `
				)
				.eq("task_id", id)
				.eq("student_id", user.id)
				.maybeSingle();

			if (submissionError) throw submissionError;

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
				});

				if (submissionData) {
					setSubmission(submissionData);
					setSubmissionContent(submissionData.content || "");
				}
			}
		} catch (error) {
			console.error("Error fetching task details:", error);
			Alert.alert("Error", "Failed to load task details");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		try {
			if (!user || !id || !submissionContent.trim()) {
				Alert.alert("Error", "Please enter your submission");
				return;
			}

			setSubmitting(true);

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

				Alert.alert("Success", "Your submission has been updated");
			} else {
				// Create new submission
				const { error } = await supabase.from("submissions").insert({
					task_id: id,
					student_id: user.id,
					content: submissionContent,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				});

				if (error) throw error;

				Alert.alert("Success", "Your submission has been received");
			}

			// Refresh task details to update status
			fetchTaskDetails();
		} catch (error) {
			console.error("Error submitting task:", error);
			Alert.alert("Error", "Failed to submit your assignment");
		} finally {
			setSubmitting(false);
		}
	};

	const canSubmit = () => {
		if (!task) return false;
		return task.status !== "overdue" || submission !== null;
	};

	const renderSubmissionSection = () => {
		if (!task) return null;

		const isOverdue = task.status === "overdue" && !submission;
		const isEditable = !isOverdue;

		return (
			<View style={styles.submissionSection}>
				<Text style={styles.sectionTitle}>Your Submission</Text>

				{isOverdue ? (
					<View style={styles.overdueBanner}>
						<Ionicons name='alert-circle' size={20} color='#f44336' />
						<Text style={styles.overdueText}>
							This assignment is overdue and can no longer be submitted
						</Text>
					</View>
				) : null}

				<View style={styles.inputContainer}>
					<TextInput
						style={[
							styles.submissionInput,
							!isEditable && styles.disabledInput,
						]}
						placeholder='Enter your submission here...'
						multiline
						value={submissionContent}
						onChangeText={setSubmissionContent}
						editable={isEditable}
					/>
				</View>

				{submission ? (
					<View style={styles.submissionInfo}>
						<Text style={styles.submissionDate}>
							Submitted: {new Date(submission.created_at).toLocaleString()}
							{submission.updated_at !== submission.created_at
								? ` (Updated: ${new Date(
										submission.updated_at
								  ).toLocaleString()})`
								: ""}
						</Text>

						{submission.grade ? (
							<View style={styles.gradeContainer}>
								<Text style={styles.gradeLabel}>Grade:</Text>
								<Text style={styles.gradeValue}>{submission.grade}/100</Text>
							</View>
						) : null}

						{submission.feedback ? (
							<View style={styles.feedbackContainer}>
								<Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
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
						disabled={submitting || !submissionContent.trim()}>
						{submitting ? (
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
									{submission ? "Update Submission" : "Submit Assignment"}
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
					title: name || "Task Details",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
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
									<View
										style={[
											styles.statusIndicator,
											{
												backgroundColor:
													task.status === "completed"
														? "#4caf50"
														: task.status === "overdue"
														? "#f44336"
														: "#ff9800",
											},
										]}
									/>
									<View style={styles.taskInfo}>
										<Text style={styles.taskTitle}>{task.title}</Text>
										<Text style={styles.groupName}>Group: {groupName}</Text>

										<View style={styles.metaRow}>
											<View style={styles.metaItem}>
												<Ionicons
													name='calendar-outline'
													size={16}
													color='#666'
													style={styles.metaIcon}
												/>
												<Text style={styles.metaText}>
													Due: {new Date(task.due_date).toLocaleDateString()}
												</Text>
											</View>

											<View style={styles.statusBadge}>
												<Text
													style={[
														styles.statusText,
														{
															color:
																task.status === "completed"
																	? "#4caf50"
																	: task.status === "overdue"
																	? "#f44336"
																	: "#ff9800",
														},
													]}>
													{task.status.charAt(0).toUpperCase() +
														task.status.slice(1)}
												</Text>
											</View>
										</View>
									</View>
								</View>

								<View style={styles.descriptionSection}>
									<Text style={styles.sectionTitle}>Description</Text>
									<Text style={styles.descriptionContent}>
										{task.description || "No description provided."}
									</Text>
								</View>

								{renderSubmissionSection()}
							</>
						) : (
							<View style={styles.errorContainer}>
								<MaterialIcons name='error-outline' size={60} color='#ccc' />
								<Text style={styles.errorText}>Task not found</Text>
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
		backgroundColor: "#f5f5f7",
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
		flexDirection: "row",
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	statusIndicator: {
		width: 4,
		height: "100%",
		borderRadius: 2,
		marginRight: 12,
	},
	taskInfo: {
		flex: 1,
	},
	taskTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	groupName: {
		fontSize: 16,
		color: "#666",
		marginBottom: 8,
	},
	metaRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	metaIcon: {
		marginRight: 4,
	},
	metaText: {
		fontSize: 14,
		color: "#666",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		backgroundColor: "#f5f5f7",
	},
	statusText: {
		fontSize: 12,
		fontWeight: "bold",
	},
	descriptionSection: {
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
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 12,
	},
	descriptionContent: {
		fontSize: 16,
		color: "#444",
		lineHeight: 24,
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
		minHeight: 150,
		padding: 12,
		fontSize: 16,
		color: "#333",
		textAlignVertical: "top",
	},
	disabledInput: {
		backgroundColor: "#f9f9f9",
		color: "#888",
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
		backgroundColor: "#3f51b5",
		borderRadius: 8,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 12,
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
