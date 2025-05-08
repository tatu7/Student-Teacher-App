import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	FlatList,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type TaskDetails = {
	id: string;
	title: string;
	description: string;
	due_date: string;
	group_id: string;
	group_name: string;
	created_at: string;
};

type Submission = {
	id: string;
	student_email: string;
	student_name: string;
	submitted_at: string;
	rating: number | null;
};

export default function TaskDetailsScreen() {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const taskId = params.id as string;
	const taskName = params.name as string;
	const groupId = params.groupId as string;
	const groupName = params.groupName as string;

	const [task, setTask] = useState<TaskDetails | null>(null);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);
	const [submissionsLoading, setSubmissionsLoading] = useState(true);

	useEffect(() => {
		fetchTaskDetails();
		fetchSubmissions();
	}, [taskId]);

	const fetchTaskDetails = async () => {
		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("tasks")
				.select("*")
				.eq("id", taskId)
				.single();

			if (error) throw error;

			// Format the task data
			setTask({
				id: data.id,
				title: data.title,
				description: data.description || "",
				due_date: data.due_date,
				group_id: groupId || data.group_id,
				group_name: groupName || "Unknown Group",
				created_at: data.created_at,
			});
		} catch (error) {
			console.error("Error fetching task details:", error);
			Alert.alert("Error", "Failed to load task details");
		} finally {
			setLoading(false);
		}
	};

	const fetchSubmissions = async () => {
		try {
			setSubmissionsLoading(true);

			// Get all submissions for this task with student information
			const { data, error } = await supabase
				.from("submissions")
				.select(
					`
          id,
          submitted_at,
          rating,
          group_students!inner(student_email),
          user_profiles!inner(email)
        `
				)
				.eq("task_id", taskId);

			if (error) throw error;

			if (data && data.length > 0) {
				// Process the submissions data
				const processedSubmissions = data.map((item) => ({
					id: item.id,
					student_email: item.user_profiles.email,
					student_name: item.user_profiles.email.split("@")[0], // Using email username as name
					submitted_at: item.submitted_at,
					rating: item.rating,
				}));

				setSubmissions(processedSubmissions);
			} else {
				setSubmissions([]);
			}
		} catch (error) {
			console.error("Error fetching submissions:", error);
			// Don't show alert, just log error
		} finally {
			setSubmissionsLoading(false);
		}
	};

	const navigateToSubmissionDetails = (
		submissionId: string,
		studentName: string
	) => {
		router.push({
			pathname: "/teacher/submissions/[id]",
			params: {
				id: submissionId,
				taskId: taskId,
				taskName: task?.title || taskName,
				studentName,
			},
		});
	};

	const renderSubmissionItem = ({ item }: { item: Submission }) => (
		<TouchableOpacity
			style={styles.submissionItem}
			onPress={() => navigateToSubmissionDetails(item.id, item.student_name)}>
			<View style={styles.submissionInfo}>
				<Ionicons name='person' size={20} color='#3f51b5' />
				<View style={styles.submissionDetails}>
					<Text style={styles.studentName}>{item.student_name}</Text>
					<Text style={styles.submissionDate}>
						Submitted: {new Date(item.submitted_at).toLocaleString()}
					</Text>
				</View>
			</View>

			<View style={styles.ratingContainer}>
				{item.rating !== null ? (
					<View style={styles.ratingBadge}>
						<Text style={styles.ratingText}>{item.rating}/10</Text>
					</View>
				) : (
					<Text style={styles.unratedText}>Not rated</Text>
				)}
				<MaterialIcons name='chevron-right' size={24} color='#999' />
			</View>
		</TouchableOpacity>
	);

	const renderEmptySubmissions = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='document-text-outline' size={48} color='#ccc' />
			<Text style={styles.emptyText}>No submissions yet</Text>
			<Text style={styles.emptySubtext}>
				Students haven't submitted their work for this task
			</Text>
		</View>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: taskName || "Task Details" }} />
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: task?.title || taskName,
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<ScrollView style={styles.content}>
				{/* Task Details Section */}
				<View style={styles.card}>
					<View style={styles.taskHeader}>
						<MaterialIcons name='assignment' size={24} color='#3f51b5' />
						<Text style={styles.taskTitle}>{task?.title}</Text>
					</View>

					<View style={styles.taskInfoRow}>
						<Ionicons name='people-outline' size={18} color='#666' />
						<Text style={styles.taskInfoText}>Group: {task?.group_name}</Text>
					</View>

					<View style={styles.taskInfoRow}>
						<Ionicons name='calendar-outline' size={18} color='#666' />
						<Text style={styles.taskInfoText}>
							Due:{" "}
							{task?.due_date
								? new Date(task.due_date).toLocaleDateString()
								: "Not set"}
						</Text>
					</View>

					{task?.description ? (
						<View style={styles.descriptionContainer}>
							<Text style={styles.descriptionLabel}>Description:</Text>
							<Text style={styles.descriptionText}>{task.description}</Text>
						</View>
					) : null}
				</View>

				{/* Submissions Section */}
				<View style={styles.submissionsSection}>
					<Text style={styles.sectionTitle}>Submissions</Text>
					{submissionsLoading ? (
						<ActivityIndicator
							size='small'
							color='#3f51b5'
							style={styles.submissionsLoader}
						/>
					) : (
						<View style={styles.submissionsContainer}>
							{submissions.length > 0
								? submissions.map((submission) =>
										renderSubmissionItem({ item: submission })
								  )
								: renderEmptySubmissions()}
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		flex: 1,
		padding: 16,
	},
	card: {
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
	taskHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
	},
	taskTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginLeft: 12,
		flex: 1,
	},
	taskInfoRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	taskInfoText: {
		fontSize: 16,
		color: "#666",
		marginLeft: 8,
	},
	descriptionContainer: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	descriptionLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	descriptionText: {
		fontSize: 16,
		color: "#666",
		lineHeight: 24,
	},
	submissionsSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 12,
	},
	submissionsLoader: {
		marginVertical: 20,
	},
	submissionsContainer: {
		backgroundColor: "white",
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		overflow: "hidden",
	},
	submissionItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	submissionInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	submissionDetails: {
		marginLeft: 12,
	},
	studentName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	submissionDate: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	ratingContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	ratingBadge: {
		backgroundColor: "#e8eaf6",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
	},
	ratingText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#3f51b5",
	},
	unratedText: {
		fontSize: 14,
		color: "#999",
		marginRight: 8,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		padding: 32,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		marginTop: 12,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginTop: 8,
	},
});
