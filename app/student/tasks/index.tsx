import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	SafeAreaView,
	Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Task = {
	id: string;
	title: string;
	description: string;
	due_date: string;
	group_id: string;
	group_name: string;
	status: "pending" | "completed" | "overdue";
	feedback?: string;
	rating?: number;
};

interface Submission {
	id: string;
	student_id: string;
	updated_at: string;
	feedback?: string;
	rating?: number;
}

export default function StudentTasksScreen() {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

	useEffect(() => {
		fetchTasks();
	}, []);

	const fetchTasks = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// First, get the groups this student is a member of
			const { data: studentGroups, error: groupsError } = await supabase
				.from("group_students")
				.select(
					`
          id,
          status,
          groups:group_id(id, name)
        `
				)
				.eq("student_id", user.id)
				.eq("status", "active");

			if (groupsError) throw groupsError;

			if (!studentGroups || studentGroups.length === 0) {
				setTasks([]);
				return;
			}

			// Get the group IDs
			const groupIds = studentGroups.map((g) => g.groups.id);

			// Fetch all tasks for these groups
			const { data: tasksData, error: tasksError } = await supabase
				.from("tasks")
				.select(
					`
          id,
          title,
          description,
          due_date,
          group_id,
          submissions(id, student_id, updated_at, feedback, rating)
        `
				)
				.in("group_id", groupIds)
				.order("due_date", { ascending: false });

			if (tasksError) throw tasksError;

			if (tasksData) {
				// Map group names to tasks and determine status
				const processedTasks = tasksData.map((task) => {
					const group = studentGroups.find(
						(g) => g.groups.id === task.group_id
					);

					// Find user's submission for this task
					const submission = task.submissions?.find(
						(s: Submission) => s.student_id === user.id
					);

					const isCompleted = !!submission;
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
						group_id: task.group_id,
						group_name: group ? group.groups.name : "Unknown Group",
						status,
						feedback: submission?.feedback,
						rating: submission?.rating,
					};
				});

				setTasks(processedTasks);
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
			Alert.alert("Error", "Failed to load tasks");
		} finally {
			setLoading(false);
		}
	};

	const navigateToTaskDetails = (
		taskId: string,
		taskTitle: string,
		groupId: string,
		groupName: string
	) => {
		router.push({
			pathname: "/student/tasks/" as any,
			params: { id: taskId, name: taskTitle, groupId, groupName },
		});
	};

	const getFilteredTasks = () => {
		if (filter === "all") return tasks;
		return tasks.filter((task) => {
			if (filter === "pending")
				return task.status === "pending" || task.status === "overdue";
			if (filter === "completed") return task.status === "completed";
			return true;
		});
	};

	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskCard}
			onPress={() =>
				navigateToTaskDetails(
					item.id,
					item.title,
					item.group_id,
					item.group_name
				)
			}>
			<View style={styles.taskHeader}>
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
				<View style={styles.taskInfo}>
					<Text style={styles.taskTitle}>{item.title}</Text>
					<Text style={styles.taskGroup}>Group: {item.group_name}</Text>
				</View>
			</View>

			<View style={styles.taskFooter}>
				<View style={styles.taskMeta}>
					<Ionicons
						name='calendar-outline'
						size={16}
						color='#666'
						style={styles.metaIcon}
					/>
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
					{item.status === "completed" && item.rating && (
						<View style={styles.gradeContainer}>
							<Text style={styles.gradeText}>{item.rating}/10</Text>
						</View>
					)}
				</View>
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons name='assignment' size={60} color='#ccc' />
			<Text style={styles.emptyText}>No tasks found</Text>
			<Text style={styles.emptySubtext}>
				You don't have any {filter !== "all" ? filter : ""} tasks assigned
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Vazifalar</Text>
			</View>

			<View style={styles.filterContainer}>
				<TouchableOpacity
					style={[
						styles.filterButton,
						filter === "all" && styles.activeFilterButton,
					]}
					onPress={() => setFilter("all")}>
					<Text
						style={[
							styles.filterText,
							filter === "all" && styles.activeFilterText,
						]}>
						All
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.filterButton,
						filter === "pending" && styles.activeFilterButton,
					]}
					onPress={() => setFilter("pending")}>
					<Text
						style={[
							styles.filterText,
							filter === "pending" && styles.activeFilterText,
						]}>
						Pending
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.filterButton,
						filter === "completed" && styles.activeFilterButton,
					]}
					onPress={() => setFilter("completed")}>
					<Text
						style={[
							styles.filterText,
							filter === "completed" && styles.activeFilterText,
						]}>
						Completed
					</Text>
				</TouchableOpacity>
			</View>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			) : (
				<FlatList
					data={getFilteredTasks()}
					renderItem={renderTaskItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyList}
					refreshing={loading}
					onRefresh={fetchTasks}
				/>
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
	filterContainer: {
		flexDirection: "row",
		padding: 16,
		paddingBottom: 0,
	},
	filterButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		marginRight: 8,
		backgroundColor: "#f0f0f0",
	},
	activeFilterButton: {
		backgroundColor: "#3f51b5",
	},
	filterText: {
		color: "#666",
	},
	activeFilterText: {
		color: "white",
		fontWeight: "600",
	},
	listContent: {
		padding: 16,
		flexGrow: 1,
	},
	taskCard: {
		backgroundColor: "white",
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		padding: 16,
	},
	taskHeader: {
		flexDirection: "row",
		marginBottom: 12,
	},
	taskStatusIndicator: {
		width: 4,
		height: "100%",
		borderRadius: 2,
		marginRight: 12,
	},
	taskInfo: {
		flex: 1,
	},
	taskTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	taskGroup: {
		fontSize: 14,
		color: "#666",
	},
	taskFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
		paddingTop: 12,
		marginLeft: 16,
	},
	taskMeta: {
		flexDirection: "row",
		alignItems: "center",
	},
	metaIcon: {
		marginRight: 4,
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
	gradeContainer: {
		backgroundColor: "#e8f5e9",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
	},
	gradeText: {
		color: "#4caf50",
		fontWeight: "bold",
		fontSize: 12,
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
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333",
	},
});
