import React, { useEffect, useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	Image,
	Dimensions,
	ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
	Ionicons,
	MaterialIcons,
	FontAwesome5,
	AntDesign,
} from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// Get screen width for responsive design
const { width } = Dimensions.get("window");
const cardWidth = (width - 56) / 2; // 2 cards per row with margins

export default function TeacherDashboard() {
	const { user } = useAuth();
	const { unreadCount } = useNotifications();
	const [stats, setStats] = useState({
		groups: 0,
		students: 0,
		tasks: 0,
		submissions: 0,
	});
	const [loading, setLoading] = useState(true);
	const [recentActivities, setRecentActivities] = useState([]);

	// Navigate to different sections
	const navigateToGroups = () => router.push("/teacher/groups" as any);
	const navigateToTasks = () => router.push("/teacher/tasks" as any);
	const navigateToSubmissions = () =>
		router.push("/teacher/submissions" as any);
	const navigateToNotifications = () =>
		router.push("/teacher/notifications" as any);

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

				// Fetch student count
				let studentCount = 0;
				if (groupIds.length > 0) {
					const { data: studentsData, error: studentsError } = await supabase
						.from("group_students")
						.select("id")
						.in("group_id", groupIds)
						.eq("status", "active");

					if (studentsError) throw studentsError;
					studentCount = studentsData?.length || 0;
				}

				// Fetch task count
				let taskCount = 0;
				if (groupIds.length > 0) {
					const { data: tasksData, error: tasksError } = await supabase
						.from("tasks")
						.select("id")
						.in("group_id", groupIds);

					if (tasksError) throw tasksError;
					taskCount = tasksData?.length || 0;
				}

				// Fetch submission count
				let submissionCount = 0;
				if (groupIds.length > 0) {
					const { data: submissionsData, error: submissionsError } =
						await supabase
							.from("submissions")
							.select("id, task_id, tasks!inner(group_id)")
							.in("tasks.group_id", groupIds);

					if (submissionsError) throw submissionsError;
					submissionCount = submissionsData?.length || 0;
				}

				setStats({
					groups: groupsData?.length || 0,
					students: studentCount,
					tasks: taskCount,
					submissions: submissionCount,
				});
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [user]);

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
							Manage your classes and assignments
						</Text>
					</View>
					<View style={styles.heroImageContainer}>
						<Ionicons name='school' size={80} color='#3f51b5' />
					</View>
				</View>

				{/* Stats Overview */}
				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#3f51b5' />
					</View>
				) : (
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
									style={[styles.statIconBox, { backgroundColor: "#E8F5E9" }]}>
									<Ionicons name='person' size={20} color='#4CAF50' />
								</View>
								<Text style={styles.statValue}>{stats.students}</Text>
								<Text style={styles.statLabel}>Students</Text>
							</View>
						</View>

						<View style={styles.statsRow}>
							<View style={styles.statCard}>
								<View
									style={[styles.statIconBox, { backgroundColor: "#FFF8E1" }]}>
									<MaterialIcons name='assignment' size={20} color='#FFA000' />
								</View>
								<Text style={styles.statValue}>{stats.tasks}</Text>
								<Text style={styles.statLabel}>Tasks</Text>
							</View>

							<View style={styles.statCard}>
								<View
									style={[styles.statIconBox, { backgroundColor: "#F3E5F5" }]}>
									<FontAwesome5
										name='clipboard-check'
										size={18}
										color='#9C27B0'
									/>
								</View>
								<Text style={styles.statValue}>{stats.submissions}</Text>
								<Text style={styles.statLabel}>Submissions</Text>
							</View>
						</View>
					</View>
				)}

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
									Manage student groups
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
									Create & manage tasks
								</Text>
							</View>
							<View style={styles.arrowContainer}>
								<AntDesign name='arrowright' size={20} color='#4caf50' />
							</View>
						</TouchableOpacity>

						{/* Submissions Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToSubmissions}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#fff8e1" }]}>
								<FontAwesome5
									name='clipboard-check'
									size={24}
									color='#ffa000'
								/>
							</View>
							<View style={styles.menuCardTextContainer}>
								<Text style={styles.menuCardTitle}>Submissions</Text>
								<Text style={styles.menuCardSubtitle}>Review & grade work</Text>
							</View>
							<View style={styles.arrowContainer}>
								<AntDesign name='arrowright' size={20} color='#ffa000' />
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
		padding: 20,
		alignItems: "center",
		justifyContent: "center",
		height: 100,
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
	heroImage: {
		width: 100,
		height: 100,
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
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 20,
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
});
