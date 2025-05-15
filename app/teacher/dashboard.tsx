import React, { useEffect, useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	ActivityIndicator,
	FlatList,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { format, parseISO } from "date-fns";

// Types
type Task = {
	id: string;
	title: string;
	group_name: string;
	due_date: string;
};

type Submission = {
	id: string;
	title: string;
	group_name: string;
	due_date: string;
	description?: string;
};

export default function TeacherDashboard() {
	const { user } = useAuth();
	const [stats, setStats] = useState({
		groups: 0,
		upcomingTasks: 0,
		submissions: 0,
	});
	const [loading, setLoading] = useState(true);
	const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
	const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);

	// Fetch dashboard data
	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!user) return;

			try {
				setLoading(true);

				// Fetch group count
				const { data: groupsData, error: groupsError } = await supabase
					.from("groups")
					.select("id")
					.eq("teacher_id", user.id);

				if (groupsError) throw groupsError;

				// Get all group IDs
				const groupIds = groupsData.map((group) => group.id);

				// Fetch upcoming tasks
				let upcomingTasksData: Task[] = [];
				if (groupIds.length > 0) {
					const { data: tasksData, error: tasksError } = await supabase
						.from("tasks")
						.select(
							`
							id, 
							title, 
							due_date,
							group_id,
							groups(name)
						`
						)
						.in("group_id", groupIds)
						.gte("due_date", new Date().toISOString())
						.order("due_date", { ascending: true })
						.limit(3); // Only get 3 tasks

					if (tasksError) throw tasksError;

					// Format task data
					upcomingTasksData = tasksData.map((task) => ({
						id: task.id,
						title: task.title,
						group_name: task.groups?.name || "Unknown Group",
						due_date: task.due_date,
					}));
				}

				// Fetch recent submissions with task details
				let submissionsData: Submission[] = [];
				if (groupIds.length > 0) {
					const { data, error } = await supabase
						.from("submissions")
						.select(
							`
							id,
							tasks!inner(
								id,
								title,
								description,
								due_date,
								group_id,
								groups(name)
							)
						`
						)
						.in("tasks.group_id", groupIds)
						.order("updated_at", { ascending: false })
						.limit(2);

					if (error) throw error;

					if (data) {
						submissionsData = data.map((item) => ({
							id: item.id,
							title: item.tasks.title,
							description: item.tasks.description,
							due_date: item.tasks.due_date,
							group_name: item.tasks.groups?.name || "Unknown Group",
						}));
					}
				}

				// Fetch submission count
				let submissionCount = 0;
				if (groupIds.length > 0) {
					const { data: submissionsCountData, error: submissionsError } =
						await supabase
							.from("submissions")
							.select("id, task_id, tasks!inner(group_id)")
							.in("tasks.group_id", groupIds);

					if (submissionsError) throw submissionsError;
					submissionCount = submissionsCountData?.length || 0;
				}

				setStats({
					groups: groupsData?.length || 0,
					upcomingTasks: upcomingTasksData.length,
					submissions: submissionCount,
				});

				setUpcomingTasks(upcomingTasksData);
				setRecentSubmissions(submissionsData);
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [user]);

	// Check if a deadline is approaching (within 48 hours)
	const isDeadlineApproaching = (dateString: string) => {
		const taskDate = new Date(dateString);
		const now = new Date();
		const diffTime = taskDate.getTime() - now.getTime();
		const diffHours = diffTime / (1000 * 60 * 60);
		return diffHours > 0 && diffHours < 48;
	};

	// Render upcoming task item
	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskCard}
			onPress={() => router.push(`/teacher/tasks/${item.id}`)}>
			<View>
				<Text style={styles.taskTitle}>{item.title}</Text>
				<Text style={styles.taskGroup}>{item.group_name}</Text>
				<View style={styles.taskDate}>
					<Ionicons name='calendar-outline' size={16} color='#666' />
					<Text style={styles.dateText}>
						Muddat: {format(parseISO(item.due_date), "MMM d")}
					</Text>
				</View>
				{isDeadlineApproaching(item.due_date) && (
					<View style={styles.deadlineWarning}>
						<Ionicons name='time-outline' size={16} color='#FF9800' />
						<Text style={styles.deadlineText}>Tez orada muddati tugaydi</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);

	// Render submission item
	const renderSubmissionItem = ({ item }: { item: Submission }) => (
		<TouchableOpacity
			style={styles.submissionCard}
			// onPress={() => router.push(`/teacher/tasks/${item.id}`)}
		>
			<Text style={styles.submissionTitle}>{item.title}</Text>
			<Text style={styles.submissionGroup}>{item.group_name}</Text>
			<Text style={styles.submissionDate}>
				{format(parseISO(item.due_date), "MM/dd/yyyy")}
			</Text>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}>
				{/* Header Section */}
				<View style={styles.header}>
					<View>
						<Text style={styles.welcomeText}>
							Salom, {user?.email?.split("@")[0] || "Karim"}
						</Text>
						<Text style={styles.roleText}>Teacher</Text>
					</View>
				</View>

				{/* Stats Overview */}
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#4169E1' />
					</View>
				) : (
					<View style={styles.statsContainer}>
						<View style={styles.statCard}>
							<View
								style={[styles.statIconCircle, { backgroundColor: "#E3F2FD" }]}>
								<Ionicons name='book-outline' size={24} color='#4169E1' />
							</View>
							<Text style={styles.statValue}>{stats.groups}</Text>
							<Text style={styles.statLabel}>Guruhlar</Text>
						</View>

						<View style={styles.statCard}>
							<View
								style={[styles.statIconCircle, { backgroundColor: "#E8EAF6" }]}>
								<Ionicons name='time-outline' size={24} color='#4169E1' />
							</View>
							<Text style={styles.statValue}>{stats.upcomingTasks}</Text>
							<Text style={styles.statLabel}>Yaqin vazifalar</Text>
						</View>

						<View style={styles.statCard}>
							<View
								style={[styles.statIconCircle, { backgroundColor: "#E0F2F1" }]}>
								<Ionicons
									name='checkmark-circle-outline'
									size={24}
									color='#4169E1'
								/>
							</View>
							<Text style={styles.statValue}>{stats.submissions}</Text>
							<Text style={styles.statLabel}>Oxirgi javoblar</Text>
						</View>
					</View>
				)}

				{/* Upcoming Tasks Section */}
				<View style={styles.tasksSection}>
					<Text style={styles.sectionTitle}>Yaqinlashgan Vazifalar</Text>

					{upcomingTasks.length > 0 ? (
						<FlatList
							data={upcomingTasks}
							renderItem={renderTaskItem}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
					) : (
						<View style={styles.noTasksContainer}>
							<Text style={styles.noTasksText}>
								Yaqinlashgan vazifalar yo'q
							</Text>
						</View>
					)}
				</View>

				{/* Recent Submissions Section */}
				<View style={styles.submissionsSection}>
					<Text style={styles.sectionTitle}>Oxirgi javoblar</Text>

					{recentSubmissions.length > 0 ? (
						<FlatList
							data={recentSubmissions}
							renderItem={renderSubmissionItem}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
					) : (
						<View style={styles.noSubmissionsContainer}>
							<Text style={styles.noSubmissionsText}>Oxirgi javoblar yo'q</Text>
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
		backgroundColor: "#F5F7FA",
	},
	scrollView: {
		flex: 1,
	},
	header: {
		backgroundColor: "#4169E1",
		paddingTop: 60,
		paddingBottom: 30,
		paddingHorizontal: 20,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "white",
		marginBottom: 5,
	},
	roleText: {
		fontSize: 18,
		color: "rgba(255, 255, 255, 0.9)",
	},
	loadingContainer: {
		padding: 20,
		alignItems: "center",
		justifyContent: "center",
		height: 100,
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		marginTop: -20,
	},
	statCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		width: "31%",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	statIconCircle: {
		width: 50,
		height: 50,
		borderRadius: 25,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 10,
	},
	statValue: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginVertical: 4,
	},
	statLabel: {
		fontSize: 12,
		color: "#666",
		textAlign: "center",
	},
	tasksSection: {
		padding: 20,
		marginTop: 20,
	},
	submissionsSection: {
		padding: 20,
		paddingTop: 0,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	taskCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
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
		marginBottom: 8,
	},
	taskDate: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	dateText: {
		fontSize: 14,
		color: "#666",
		marginLeft: 6,
	},
	deadlineWarning: {
		flexDirection: "row",
		alignItems: "center",
	},
	deadlineText: {
		fontSize: 14,
		color: "#FF9800",
		marginLeft: 6,
	},
	submissionCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	submissionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginBottom: 6,
	},
	submissionGroup: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	submissionDate: {
		fontSize: 14,
		color: "#888",
		position: "absolute",
		top: 16,
		right: 16,
	},
	noTasksContainer: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 20,
		alignItems: "center",
	},
	noTasksText: {
		fontSize: 16,
		color: "#666",
	},
	noSubmissionsContainer: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 20,
		alignItems: "center",
	},
	noSubmissionsText: {
		fontSize: 16,
		color: "#666",
	},
});
