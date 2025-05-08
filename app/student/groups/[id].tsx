import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	SafeAreaView,
	Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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

interface Submission {
	id: string;
	student_id: string;
	created_at: string;
	feedback?: string;
	grade?: number;
}

export default function GroupDetailsScreen() {
	const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [studentCount, setStudentCount] = useState(0);
	const [teacherName, setTeacherName] = useState("");

	useEffect(() => {
		fetchGroupDetails();
	}, [id]);

	const fetchGroupDetails = async () => {
		try {
			setLoading(true);

			if (!user || !id) return;

			// Fetch group details
			const { data: groupData, error: groupError } = await supabase
				.from("groups")
				.select(
					`
          name,
          teacher_id
        `
				)
				.eq("id", id)
				.single();

			if (groupError) throw groupError;

			if (groupData?.teacher_id) {
				// Fetch teacher information
				const { data: teacherData, error: teacherError } = await supabase
					.from("user_profiles")
					.select("email")
					.eq("id", groupData.teacher_id)
					.single();

				if (teacherError) throw teacherError;

				if (teacherData?.email) {
					setTeacherName(teacherData.email.split("@")[0] || "Teacher");
				}
			}

			// Count students in the group
			const { count, error: countError } = await supabase
				.from("group_students")
				.select("*", { count: "exact", head: true })
				.eq("group_id", id)
				.eq("status", "active");

			if (countError) throw countError;
			setStudentCount(count || 0);

			// Fetch tasks for this group
			const { data: tasksData, error: tasksError } = await supabase
				.from("tasks")
				.select(
					`
          id,
          title,
          description,
          due_date,
          submissions(id, student_id, created_at, feedback, grade)
        `
				)
				.eq("group_id", id)
				.order("due_date", { ascending: false });

			if (tasksError) throw tasksError;

			if (tasksData) {
				// Process tasks with their completion status
				const processedTasks = tasksData.map((task) => {
					const isCompleted =
						task.submissions &&
						task.submissions.some((s: Submission) => s.student_id === user.id);
					const isOverdue =
						new Date(task.due_date) < new Date() && !isCompleted;

					const status: "pending" | "completed" | "overdue" = isCompleted
						? "completed"
						: isOverdue
						? "overdue"
						: "pending";

					return {
						id: task.id,
						title: task.title,
						description: task.description || "",
						due_date: task.due_date,
						status,
					};
				});

				setTasks(processedTasks);
			}
		} catch (error) {
			console.error("Error fetching group details:", error);
			Alert.alert("Error", "Failed to load group details");
		} finally {
			setLoading(false);
		}
	};

	const navigateToTaskDetails = (taskId: string, taskTitle: string) => {
		router.push({
			pathname: "/student/tasks/" as any,
			params: { id: taskId, name: taskTitle, groupId: id, groupName: name },
		});
	};

	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskItem}
			onPress={() => navigateToTaskDetails(item.id, item.title)}>
			<View
				style={[
					styles.taskStatusIndicator,
					{
						backgroundColor:
							item.status === "completed"
								? "#4caf50"
								: item.status === "overdue"
								? "#f44336"
								: "#ff9800",
					},
				]}
			/>
			<View style={styles.taskContent}>
				<View style={styles.taskDetails}>
					<Text style={styles.taskTitle}>{item.title}</Text>
					<Text style={styles.taskDate}>
						Due: {new Date(item.due_date).toLocaleDateString()}
					</Text>
				</View>
				<View style={styles.taskStatus}>
					<Text
						style={[
							styles.taskStatusText,
							{
								color:
									item.status === "completed"
										? "#4caf50"
										: item.status === "overdue"
										? "#f44336"
										: "#ff9800",
							},
						]}>
						{item.status.charAt(0).toUpperCase() + item.status.slice(1)}
					</Text>
					<MaterialIcons name='chevron-right' size={24} color='#999' />
				</View>
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons name='assignment' size={60} color='#ccc' />
			<Text style={styles.emptyText}>No tasks found</Text>
			<Text style={styles.emptySubtext}>
				No tasks have been assigned to this group yet
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: name || "Group Details",
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
				<>
					<View style={styles.groupInfoCard}>
						<View style={styles.groupIconContainer}>
							<Ionicons name='people' size={28} color='#3f51b5' />
						</View>
						<View style={styles.groupInfo}>
							<Text style={styles.groupName}>{name}</Text>
							<Text style={styles.groupTeacher}>Teacher: {teacherName}</Text>
							<Text style={styles.groupMembers}>
								{studentCount} student{studentCount !== 1 ? "s" : ""}
							</Text>
						</View>
					</View>

					<View style={styles.tasksSection}>
						<Text style={styles.sectionTitle}>Tasks</Text>

						<FlatList
							data={tasks}
							renderItem={renderTaskItem}
							keyExtractor={(item) => item.id}
							contentContainerStyle={styles.listContent}
							ListEmptyComponent={renderEmptyList}
							refreshing={loading}
							onRefresh={fetchGroupDetails}
						/>
					</View>
				</>
			)}
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
	groupInfoCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 20,
		margin: 16,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	groupIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#e8eaf6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	groupInfo: {
		flex: 1,
	},
	groupName: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	groupTeacher: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	groupMembers: {
		fontSize: 14,
		color: "#666",
	},
	tasksSection: {
		flex: 1,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	listContent: {
		flexGrow: 1,
	},
	taskItem: {
		backgroundColor: "white",
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	taskStatusIndicator: {
		width: 4,
		height: "100%",
		borderTopLeftRadius: 12,
		borderBottomLeftRadius: 12,
		position: "absolute",
		left: 0,
		top: 0,
	},
	taskContent: {
		flexDirection: "row",
		padding: 16,
		paddingLeft: 20,
	},
	taskDetails: {
		flex: 1,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	taskDate: {
		fontSize: 14,
		color: "#666",
	},
	taskStatus: {
		flexDirection: "row",
		alignItems: "center",
	},
	taskStatusText: {
		fontSize: 14,
		fontWeight: "500",
		marginRight: 8,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		marginTop: 60,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginTop: 8,
	},
});
