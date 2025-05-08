import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	FlatList,
	ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

// Types
type Group = {
	id: string;
	name: string;
	pending_tasks: number;
	completed_tasks: number;
};

type Task = {
	id: string;
	title: string;
	group_name: string;
	due_date: string;
	status: "pending" | "completed" | "overdue";
};

export default function StudentDashboard() {
	const { user, signOut } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [recentTasks, setRecentTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Fetch groups that the student is a member of
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

			if (studentGroups && studentGroups.length > 0) {
				// Get group IDs for further queries
				const groupIds = studentGroups.map((g) => g.groups.id);

				// Get all tasks for these groups
				const { data: tasks, error: tasksError } = await supabase
					.from("tasks")
					.select(
						`
						id,
						title,
						due_date,
						group_id,
						submissions(id, student_id)
					`
					)
					.in("group_id", groupIds)
					.order("due_date", { ascending: false });

				if (tasksError) throw tasksError;

				// Process groups with task counts
				const processedGroups = studentGroups.map((group) => {
					const groupTasks =
						tasks?.filter((t) => t.group_id === group.groups.id) || [];
					const completedTasks = groupTasks.filter(
						(t) =>
							t.submissions &&
							t.submissions.some(
								(s: { student_id: string }) =>
									s.student_id === user.id.toString()
							)
					).length;

					return {
						id: group.groups.id,
						name: group.groups.name,
						pending_tasks: groupTasks.length - completedTasks,
						completed_tasks: completedTasks,
					};
				});

				setGroups(processedGroups);

				// Process recent tasks
				if (tasks) {
					const recentTasksList = tasks.slice(0, 5).map((task) => {
						const isCompleted =
							task.submissions &&
							task.submissions.some(
								(s: { student_id: string }) => s.student_id === user.id
							);
						const isOverdue =
							new Date(task.due_date) < new Date() && !isCompleted;

						// Find group name
						const group = studentGroups.find(
							(g) => g.groups.id === task.group_id
						);

						return {
							id: task.id,
							title: task.title,
							group_name: group ? group.groups.name : "Unknown Group",
							due_date: task.due_date,
							status: isCompleted
								? "completed"
								: isOverdue
								? "overdue"
								: "pending",
						};
					});

					setRecentTasks(recentTasksList as Task[]);
				}
			} else {
				setGroups([]);
				setRecentTasks([] as Task[]);
			}
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroups = () => router.push("/student/groups");
	const navigateToTasks = () => router.push("/student/tasks");
	const navigateToCalendar = () => router.push("/student/calendar");

	const renderGroupItem = ({ item }: { item: Group }) => (
		<TouchableOpacity
			style={styles.groupCard}
			onPress={() =>
				router.push({
					pathname: "/student/groups/[id]",
					params: { id: item.id, name: item.name },
				})
			}>
			<View style={styles.groupIconContainer}>
				<Ionicons name='people' size={24} color='#3f51b5' />
			</View>
			<View style={styles.groupDetails}>
				<Text style={styles.groupName}>{item.name}</Text>
				<View style={styles.taskStats}>
					<Text style={styles.pendingTasks}>{item.pending_tasks} pending</Text>
					<Text style={styles.completedTasks}>
						{item.completed_tasks} completed
					</Text>
				</View>
			</View>
			<MaterialIcons name='chevron-right' size={24} color='#999' />
		</TouchableOpacity>
	);

	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskItem}
			onPress={() =>
				router.push({
					pathname: "/student/tasks/[id]",
					params: { id: item.id, name: item.title },
				})
			}>
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
			<View style={styles.taskDetails}>
				<Text style={styles.taskTitle}>{item.title}</Text>
				<Text style={styles.taskMeta}>
					{item.group_name} • Due:{" "}
					{new Date(item.due_date).toLocaleDateString()}
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
			</View>
		</TouchableOpacity>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen
					options={{
						title: "Student Dashboard",
						headerTitleStyle: {
							fontWeight: "bold",
						},
						headerTitleAlign: "center",
					}}
				/>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Student Dashboard",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerTitleAlign: "center",
				}}
			/>

			<ScrollView style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.welcomeText}>Welcome, Student</Text>
					<Text style={styles.emailText}>{user?.email}</Text>
				</View>

				{/* Main Menu Cards */}
				<View style={styles.menuSection}>
					<Text style={styles.sectionTitle}>Quick Access</Text>

					<View style={styles.menuGrid}>
						{/* Groups Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToGroups}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e3f2fd" }]}>
								<Ionicons name='people' size={32} color='#2196f3' />
							</View>
							<Text style={styles.menuCardTitle}>Groups</Text>
							<Text style={styles.menuCardSubtitle}>
								View your joined groups
							</Text>
						</TouchableOpacity>

						{/* Tasks Card */}
						<TouchableOpacity style={styles.menuCard} onPress={navigateToTasks}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e8f5e9" }]}>
								<MaterialIcons name='assignment' size={32} color='#4caf50' />
							</View>
							<Text style={styles.menuCardTitle}>Tasks</Text>
							<Text style={styles.menuCardSubtitle}>
								Manage your assignments
							</Text>
						</TouchableOpacity>

						{/* Calendar Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToCalendar}>
							<View style={styles.menuIconContainer}>
								<Ionicons name='calendar' size={32} color='#3f51b5' />
							</View>
							<Text style={styles.menuCardTitle}>Calendar</Text>
							<Text style={styles.menuCardSubtitle}>Track your deadlines</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Groups Section */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Your Groups</Text>
						<TouchableOpacity onPress={navigateToGroups}>
							<Text style={styles.seeAllText}>See All</Text>
						</TouchableOpacity>
					</View>

					{groups.length > 0 ? (
						<FlatList
							data={groups}
							renderItem={renderGroupItem}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
					) : (
						<View style={styles.emptyState}>
							<Ionicons name='people-outline' size={48} color='#ccc' />
							<Text style={styles.emptyStateText}>
								You haven't joined any groups yet
							</Text>
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
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},

	content: {
		flex: 1,
		padding: 16,
	},
	header: {
		marginBottom: 24,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
	},
	emailText: {
		fontSize: 16,
		color: "#666",
		marginTop: 4,
	},
	menuSection: {
		marginBottom: 24,
	},
	section: {
		marginBottom: 24,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
	},
	seeAllText: {
		color: "#3f51b5",
		fontWeight: "600",
	},
	menuGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	menuCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 20,
		width: "48%",
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	iconContainer: {
		width: 60,
		height: 60,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12,
	},
	menuCardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 6,
	},
	menuCardSubtitle: {
		fontSize: 14,
		color: "#666",
	},
	groupCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	groupIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#e8eaf6",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	groupDetails: {
		flex: 1,
	},
	groupName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	taskStats: {
		flexDirection: "row",
	},
	pendingTasks: {
		fontSize: 14,
		color: "#ff9800",
		marginRight: 12,
	},
	completedTasks: {
		fontSize: 14,
		color: "#4caf50",
	},
	taskItem: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	taskStatusIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 16,
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
	taskMeta: {
		fontSize: 14,
		color: "#666",
	},
	taskStatus: {
		marginLeft: 8,
	},
	taskStatusText: {
		fontSize: 14,
		fontWeight: "600",
	},
	emptyState: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 24,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	emptyStateText: {
		fontSize: 16,
		color: "#666",
		marginTop: 12,
		textAlign: "center",
	},
	menuIconContainer: {
		width: 60,
		height: 60,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12,
	},
	menuSectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
});
