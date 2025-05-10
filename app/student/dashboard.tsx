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
	Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useNotifications } from "../../context/NotificationsContext";
import {
	Ionicons,
	MaterialIcons,
	FontAwesome5,
	AntDesign,
} from "@expo/vector-icons";

// Get screen width for responsive design
const { width } = Dimensions.get("window");
const cardWidth = (width - 56) / 2; // 2 cards per row with margins

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
	const { user } = useAuth();
	const { unreadCount } = useNotifications();
	const [groups, setGroups] = useState<Group[]>([]);
	const [recentTasks, setRecentTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		groups: 0,
		pendingTasks: 0,
		completedTasks: 0,
		overdueTasks: 0,
	});

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

				// Calculate stats
				let pendingCount = 0;
				let completedCount = 0;
				let overdueCount = 0;

				// Process recent tasks and count stats
				if (tasks) {
					const recentTasksList = tasks.slice(0, 5).map((task) => {
						const isCompleted =
							task.submissions &&
							task.submissions.some(
								(s: { student_id: string }) => s.student_id === user.id
							);
						const isOverdue =
							new Date(task.due_date) < new Date() && !isCompleted;

						// Update stats counters
						if (isCompleted) {
							completedCount++;
						} else if (isOverdue) {
							overdueCount++;
						} else {
							pendingCount++;
						}

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

				// Set overall stats
				setStats({
					groups: studentGroups.length,
					pendingTasks: pendingCount,
					completedTasks: completedCount,
					overdueTasks: overdueCount,
				});
			} else {
				setGroups([]);
				setRecentTasks([] as Task[]);
				setStats({
					groups: 0,
					pendingTasks: 0,
					completedTasks: 0,
					overdueTasks: 0,
				});
			}
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroups = () => router.push("/student/groups" as any);
	const navigateToTasks = () => router.push("/student/tasks" as any);
	const navigateToNotifications = () =>
		router.push("/student/notifications" as any);

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
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}>
				{/* Hero Section */}
				<View style={styles.heroSection}>
					<View style={styles.heroContent}>
						<Text style={styles.welcomeText}>Welcome back,</Text>
						<Text style={styles.nameText}>{user?.email?.split("@")[0]}</Text>
						<Text style={styles.subtitleText}>
							Track your tasks and assignments
						</Text>
					</View>
					<View style={styles.heroImageContainer}>
						<Ionicons name='school-outline' size={80} color='#3f51b5' />
					</View>
				</View>

				{/* Stats Overview */}
				<View style={styles.statsContainer}>
					<View style={styles.statsRow}>
						<View style={styles.statCard}>
							<View
								style={[styles.statIconBox, { backgroundColor: "#E3F2FD" }]}>
								<Ionicons name='people' size={20} color='#2196F3' />
							</View>
							<Text style={styles.statValue}>{stats.groups}</Text>
							<Text style={styles.statLabel}>Groups</Text>
						</View>

						<View style={styles.statCard}>
							<View
								style={[styles.statIconBox, { backgroundColor: "#FFF8E1" }]}>
								<Ionicons name='time' size={20} color='#FF9800' />
							</View>
							<Text style={styles.statValue}>{stats.pendingTasks}</Text>
							<Text style={styles.statLabel}>Pending</Text>
						</View>
					</View>

					<View style={styles.statsRow}>
						<View style={styles.statCard}>
							<View
								style={[styles.statIconBox, { backgroundColor: "#E8F5E9" }]}>
								<Ionicons name='checkmark-circle' size={20} color='#4CAF50' />
							</View>
							<Text style={styles.statValue}>{stats.completedTasks}</Text>
							<Text style={styles.statLabel}>Completed</Text>
						</View>

						<View style={styles.statCard}>
							<View
								style={[styles.statIconBox, { backgroundColor: "#FFEBEE" }]}>
								<Ionicons name='alert-circle' size={20} color='#F44336' />
							</View>
							<Text style={styles.statValue}>{stats.overdueTasks}</Text>
							<Text style={styles.statLabel}>Overdue</Text>
						</View>
					</View>
				</View>

				{/* Quick Access Section */}
				<View style={styles.quickAccessSection}>
					<Text style={styles.sectionTitle}>Quick Access</Text>

					<View style={styles.menuGrid}>
						{/* Groups Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToGroups}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e3f2fd" }]}>
								<Ionicons name='people' size={28} color='#2196f3' />
							</View>
							<View style={styles.menuCardTextContainer}>
								<Text style={styles.menuCardTitle}>Groups</Text>
								<Text style={styles.menuCardSubtitle}>
									View your joined groups
								</Text>
							</View>
							<View style={styles.arrowContainer}>
								<AntDesign name='arrowright' size={20} color='#2196f3' />
							</View>
						</TouchableOpacity>

						{/* Tasks Card */}
						<TouchableOpacity style={styles.menuCard} onPress={navigateToTasks}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e8f5e9" }]}>
								<MaterialIcons name='assignment' size={28} color='#4caf50' />
							</View>
							<View style={styles.menuCardTextContainer}>
								<Text style={styles.menuCardTitle}>Tasks</Text>
								<Text style={styles.menuCardSubtitle}>
									Manage your assignments
								</Text>
							</View>
							<View style={styles.arrowContainer}>
								<AntDesign name='arrowright' size={20} color='#4caf50' />
							</View>
						</TouchableOpacity>

						{/* Notifications Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToNotifications}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#f3e5f5" }]}>
								<Ionicons name='notifications' size={28} color='#9c27b0' />
								{unreadCount > 0 && (
									<View style={styles.notificationBadge}>
										<Text style={styles.notificationBadgeText}>
											{unreadCount > 9 ? "9+" : unreadCount}
										</Text>
									</View>
								)}
							</View>
							<View style={styles.menuCardTextContainer}>
								<Text style={styles.menuCardTitle}>Notifications</Text>
								<Text style={styles.menuCardSubtitle}>
									Check messages & alerts
								</Text>
							</View>
							<View style={styles.arrowContainer}>
								<AntDesign name='arrowright' size={20} color='#9c27b0' />
							</View>
						</TouchableOpacity>
					</View>
				</View>

				{/* Groups Section */}
				<View style={styles.groupsSection}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Your Groups</Text>
						<TouchableOpacity onPress={navigateToGroups}>
							<Text style={styles.seeAllText}>See All</Text>
						</TouchableOpacity>
					</View>

					{groups.length > 0 ? (
						<View style={styles.groupsList}>
							{groups.slice(0, 3).map((item) => renderGroupItem({ item }))}
						</View>
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
	scrollView: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	heroSection: {
		flexDirection: "row",
		padding: 20,
		paddingBottom: 30,
		backgroundColor: "white",
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 15,
		elevation: 5,
		marginBottom: 20,
	},
	heroContent: {
		flex: 1,
		justifyContent: "center",
	},
	welcomeText: {
		fontSize: 20,
		color: "#666",
	},
	nameText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
		textTransform: "capitalize",
	},
	subtitleText: {
		fontSize: 16,
		color: "#777",
		lineHeight: 22,
	},
	heroImageContainer: {
		width: 120,
		height: 120,
		justifyContent: "center",
		alignItems: "center",
	},
	statsContainer: {
		padding: 15,
		marginHorizontal: 20,
		marginBottom: 25,
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 15,
	},
	statCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 15,
		width: cardWidth,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	statIconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 10,
	},
	statValue: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
	},
	statLabel: {
		fontSize: 14,
		color: "#777",
		marginTop: 5,
	},
	quickAccessSection: {
		padding: 20,
		paddingBottom: 5,
	},
	recentTasksSection: {
		padding: 20,
		paddingTop: 0,
	},
	groupsSection: {
		padding: 20,
		paddingTop: 0,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 15,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	seeAllText: {
		color: "#3f51b5",
		fontWeight: "600",
	},
	menuGrid: {
		marginBottom: 15,
	},
	menuCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 15,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	iconContainer: {
		width: 50,
		height: 50,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 15,
		position: "relative",
	},
	menuCardTextContainer: {
		flex: 1,
	},
	menuCardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	menuCardSubtitle: {
		fontSize: 14,
		color: "#777",
	},
	arrowContainer: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#f5f5f7",
		justifyContent: "center",
		alignItems: "center",
	},
	notificationBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		backgroundColor: "#f44336",
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: "white",
	},
	notificationBadgeText: {
		color: "white",
		fontSize: 10,
		fontWeight: "bold",
	},
	groupCard: {
		backgroundColor: "white",
		borderRadius: 16,
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
	tasksList: {
		marginBottom: 5,
	},
	groupsList: {
		marginBottom: 5,
	},
	taskItem: {
		backgroundColor: "white",
		borderRadius: 16,
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
		borderRadius: 16,
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
});
