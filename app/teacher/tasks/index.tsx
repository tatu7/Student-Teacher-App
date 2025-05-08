import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	Alert,
	SafeAreaView,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Task = {
	id: string;
	title: string;
	due_date: string;
	group_name: string;
	group_id: string;
	submission_count: number;
};

export default function TasksScreen() {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchTasks();
	}, []);

	const fetchTasks = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// First, get the groups for this teacher
			const { data: groupsData, error: groupsError } = await supabase
				.from("groups")
				.select("id, name")
				.eq("teacher_id", user.id);

			if (groupsError) throw groupsError;

			if (groupsData.length === 0) {
				setTasks([]);
				return;
			}

			// Get all group IDs
			const groupIds = groupsData.map((group) => group.id);

			// Now get tasks for all these groups
			const { data: tasksData, error: tasksError } = await supabase
				.from("tasks")
				.select(
					`
          id, 
          title, 
          due_date,
          group_id,
          submissions:submissions(count)
        `
				)
				.in("group_id", groupIds)
				.order("due_date", { ascending: false });

			if (tasksError) throw tasksError;

			// Map group names to tasks
			const processedTasks = tasksData.map((task) => {
				const group = groupsData.find((g) => g.id === task.group_id);
				return {
					id: task.id,
					title: task.title,
					due_date: task.due_date,
					group_name: group ? group.name : "Unknown Group",
					group_id: task.group_id,
					submission_count: task.submissions[0]?.count || 0,
				};
			});

			setTasks(processedTasks);
		} catch (error) {
			console.error("Error fetching tasks:", error);
			Alert.alert("Error", "Failed to load tasks");
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroupSelection = () => {
		router.push("/teacher/tasks/create");
	};

	const navigateToTaskDetails = (
		taskId: string,
		taskName: string,
		groupId: string,
		groupName: string
	) => {
		router.push({
			pathname: "/teacher/tasks/[id]",
			params: { id: taskId, name: taskName, groupId, groupName },
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
				<View style={styles.taskIcon}>
					<MaterialIcons name='assignment' size={24} color='#3f51b5' />
				</View>
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

				<View style={styles.taskStats}>
					<Text style={styles.submissionCount}>
						{item.submission_count} submission
						{item.submission_count !== 1 ? "s" : ""}
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
				Create your first task to assign to students
			</Text>
			<TouchableOpacity
				style={styles.createButton}
				onPress={navigateToGroupSelection}>
				<Text style={styles.createButtonText}>Create Task</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Tasks",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerRight: () => (
						<TouchableOpacity
							onPress={navigateToGroupSelection}
							style={styles.headerButton}>
							<Ionicons name='add' size={24} color='#3f51b5' />
						</TouchableOpacity>
					),
				}}
			/>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			) : (
				<FlatList
					data={tasks}
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
	headerButton: {
		marginRight: 15,
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
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
	taskIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#e8eaf6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	taskInfo: {
		flex: 1,
		justifyContent: "center",
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
	taskStats: {
		flexDirection: "row",
		alignItems: "center",
	},
	submissionCount: {
		fontSize: 14,
		color: "#666",
		marginRight: 8,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		marginTop: 80,
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
		marginBottom: 24,
	},
	createButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	createButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
