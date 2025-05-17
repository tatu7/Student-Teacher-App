import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	ActivityIndicator,
	Dimensions,
	ImageBackground,
	useWindowDimensions,
	Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format, isBefore } from "date-fns";
import CustomBackground from "@/components/CustomBackground";
import { icons } from "@/constants/icons";

// Types
type Task = {
	id: string;
	title: string;
	group_name: string;
	due_date: string;
	status: "pending" | "completed" | "overdue";
};

type SubmittedTask = {
	id: string;
	task_id: string;
	task_title: string;
	group_name: string;
	submitted_at: string;
	feedback?: string;
	rating?: number | null;
};

export default function StudentDashboard() {
	const { user } = useAuth();
	const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
	const [submittedTasks, setSubmittedTasks] = useState<SubmittedTask[]>([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		groupCount: 0,
		pendingTasks: 0,
		completedTasks: 0,
	});
	const [userName, setUserName] = useState("");
	const { width: screenWidth } = useWindowDimensions();

	// Determine if we're on a small screen
	const isSmallScreen = screenWidth < 380;
	const isVerySmallScreen = screenWidth < 340;

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Fetch user profile to get name
			const { data: profileData, error: profileError } = await supabase
				.from("user_profiles")
				.select("name")
				.eq("id", user.id)
				.single();

			if (profileError) throw profileError;

			if (profileData) {
				setUserName(profileData.name || user.email?.split("@")[0] || "");
			}

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
					.order("due_date", { ascending: true });

				if (tasksError) throw tasksError;

				// Process tasks and count stats
				let pendingCount = 0;
				let completedCount = 0;
				let upcomingTasksList: Task[] = [];

				if (tasks) {
					// Process all tasks for statistics
					tasks.forEach((task) => {
						const isCompleted =
							task.submissions &&
							task.submissions.some(
								(s: { student_id: string }) => s.student_id === user.id
							);

						if (isCompleted) {
							completedCount++;
						} else {
							pendingCount++;
						}

						// Find group name
						const group = studentGroups.find(
							(g) => g.groups.id === task.group_id
						);

						// For upcoming tasks list, only include pending/overdue tasks
						if (!isCompleted) {
							const isOverdue = isBefore(new Date(task.due_date), new Date());

							upcomingTasksList.push({
								id: task.id,
								title: task.title,
								group_name: group ? group.groups.name : "Guruh nomi",
								due_date: task.due_date,
								status: isOverdue ? "overdue" : "pending",
							});
						}
					});

					// Sort by due date (closest first) and limit to 5 tasks
					upcomingTasksList.sort(
						(a, b) =>
							new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
					);

					setUpcomingTasks(upcomingTasksList.slice(0, 5));
				}

				// Set overall stats
				setStats({
					groupCount: studentGroups.length,
					pendingTasks: pendingCount,
					completedTasks: completedCount,
				});

				// Fetch student's submitted tasks with grades
				const { data: submissions, error: submissionsError } = await supabase
					.from("submissions")
					.select(
						`
						id,
						task_id,
						updated_at,
						feedback,
						rating,
						tasks(title, group_id)
					`
					)
					.eq("student_id", user.id)
					.order("updated_at", { ascending: false })
					.limit(5);

				if (submissionsError) throw submissionsError;

				if (submissions && submissions.length > 0) {
					const processedSubmissions = submissions.map((submission) => {
						// Find group name
						const group = studentGroups.find(
							(g) => g.groups.id === submission.tasks.group_id
						);

						return {
							id: submission.id,
							task_id: submission.task_id,
							task_title: submission.tasks.title,
							group_name: group ? group.groups.name : "Guruh nomi",
							submitted_at: submission.updated_at,
							feedback: submission.feedback,
							rating: submission.rating,
						};
					});

					setSubmittedTasks(processedSubmissions);
				} else {
					setSubmittedTasks([]);
				}
			} else {
				setUpcomingTasks([]);
				setSubmittedTasks([]);
				setStats({
					groupCount: 0,
					pendingTasks: 0,
					completedTasks: 0,
				});
			}
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const navigateToTask = (taskId: string) => {
		router.push({
			pathname: "/student/groups/task/[id]",
			params: { id: taskId },
		});
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return format(date, "dd/MM/yyyy");
	};

	// Helper function for responsive sizes
	const getResponsiveSize = (
		baseSize: number,
		smallSize: number,
		verySmallSize?: number
	): number => {
		if (isVerySmallScreen && verySmallSize !== undefined) return verySmallSize;
		return isSmallScreen ? smallSize : baseSize;
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<CustomBackground image={icons.bg6}>
				<ScrollView
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}>
					{/* Header Section */}
					<View
						style={[
							styles.headerSection,
							{
								paddingTop: getResponsiveSize(60, 40, 30),
								paddingBottom: getResponsiveSize(30, 20, 15),
								paddingHorizontal: getResponsiveSize(20, 16, 12),
								borderBottomLeftRadius: getResponsiveSize(30, 20, 15),
								borderBottomRightRadius: getResponsiveSize(30, 20, 15),
							},
						]}>
						<Text
							style={[
								styles.welcomeText,
								{
									fontSize: getResponsiveSize(24, 20, 18),
									marginBottom: getResponsiveSize(4, 3, 2),
								},
							]}>
							Salom, {userName}
						</Text>
						<Text
							style={[
								styles.roleText,
								{
									fontSize: getResponsiveSize(16, 14, 12),
								},
							]}>
							Student
						</Text>
					</View>

					{/* Stats Cards */}
					<View
						style={[
							styles.statsContainer,
							{
								paddingHorizontal: getResponsiveSize(16, 12, 8),
								marginTop: getResponsiveSize(-30, -25, -20),
							},
						]}>
						<View
							style={[
								styles.statCard,
								{
									padding: getResponsiveSize(16, 12, 10),
									borderRadius: getResponsiveSize(16, 12, 10),
								},
							]}>
							<View
								style={[
									styles.statIconContainer,
									styles.blueIcon,
									{
										width: getResponsiveSize(48, 40, 36),
										height: getResponsiveSize(48, 40, 36),
										borderRadius: getResponsiveSize(24, 20, 18),
										marginBottom: getResponsiveSize(8, 6, 4),
									},
								]}>
								<Ionicons
									name='book-outline'
									size={getResponsiveSize(24, 20, 18)}
									color='#4169E1'
								/>
							</View>
							<Text
								style={[
									styles.statValue,
									{ fontSize: getResponsiveSize(24, 20, 18) },
								]}>
								{stats.groupCount}
							</Text>
							<Text
								style={[
									styles.statLabel,
									{ fontSize: getResponsiveSize(12, 10, 9) },
								]}>
								Darslar
							</Text>
						</View>

						<View
							style={[
								styles.statCard,
								{
									padding: getResponsiveSize(16, 12, 10),
									borderRadius: getResponsiveSize(16, 12, 10),
								},
							]}>
							<View
								style={[
									styles.statIconContainer,
									styles.purpleIcon,
									{
										width: getResponsiveSize(48, 40, 36),
										height: getResponsiveSize(48, 40, 36),
										borderRadius: getResponsiveSize(24, 20, 18),
										marginBottom: getResponsiveSize(8, 6, 4),
									},
								]}>
								<Ionicons
									name='time-outline'
									size={getResponsiveSize(24, 20, 18)}
									color='#9966CC'
								/>
							</View>
							<Text
								style={[
									styles.statValue,
									{ fontSize: getResponsiveSize(24, 20, 18) },
								]}>
								{stats.pendingTasks}
							</Text>
							<Text
								style={[
									styles.statLabel,
									{ fontSize: getResponsiveSize(12, 10, 9) },
								]}>
								{isSmallScreen ? "Vazifalar" : "Yaqin vazifalar"}
							</Text>
						</View>

						<View
							style={[
								styles.statCard,
								{
									padding: getResponsiveSize(16, 12, 10),
									borderRadius: getResponsiveSize(16, 12, 10),
								},
							]}>
							<View
								style={[
									styles.statIconContainer,
									styles.greenIcon,
									{
										width: getResponsiveSize(48, 40, 36),
										height: getResponsiveSize(48, 40, 36),
										borderRadius: getResponsiveSize(24, 20, 18),
										marginBottom: getResponsiveSize(8, 6, 4),
									},
								]}>
								<Ionicons
									name='checkmark-circle-outline'
									size={getResponsiveSize(24, 20, 18)}
									color='#4CAF50'
								/>
							</View>
							<Text
								style={[
									styles.statValue,
									{ fontSize: getResponsiveSize(24, 20, 18) },
								]}>
								{stats.completedTasks}
							</Text>
							<Text
								style={[
									styles.statLabel,
									{ fontSize: getResponsiveSize(12, 10, 9) },
								]}>
								Bajarilgan
							</Text>
						</View>
					</View>

					{/* Upcoming Tasks Section */}
					<View
						style={[
							styles.tasksSection,
							{
								padding: getResponsiveSize(20, 16, 12),
								marginTop: getResponsiveSize(10, 8, 6),
							},
						]}>
						<Text
							style={[
								styles.sectionTitle,
								{
									fontSize: getResponsiveSize(18, 16, 14),
									marginBottom: getResponsiveSize(16, 12, 10),
								},
							]}>
							Yaqinlashgan Vazifalar
						</Text>

						{upcomingTasks.length > 0 ? (
							upcomingTasks.map((task) => (
								<TouchableOpacity
									key={task.id}
									style={[
										styles.taskCard,
										{
											padding: getResponsiveSize(16, 14, 12),
											marginBottom: getResponsiveSize(16, 12, 10),
											borderRadius: getResponsiveSize(16, 12, 10),
										},
									]}
									onPress={() => navigateToTask(task.id)}>
									<View
										style={[
											styles.taskHeader,
											{ marginBottom: getResponsiveSize(12, 10, 8) },
										]}>
										<Text
											style={[
												styles.taskTitle,
												{
													fontSize: getResponsiveSize(18, 16, 14),
													marginBottom: getResponsiveSize(4, 3, 2),
												},
											]}>
											{task.title}
										</Text>
										<Text
											style={[
												styles.taskGroup,
												{
													fontSize: getResponsiveSize(14, 12, 11),
													marginBottom: getResponsiveSize(2, 2, 1),
												},
											]}>
											{task.group_name}
										</Text>
										<Text
											style={[
												styles.taskSubtitle,
												{ fontSize: getResponsiveSize(14, 12, 11) },
											]}>
											task{task.title.toLowerCase().includes("task") ? "" : "2"}
										</Text>
									</View>

									<View
										style={[
											styles.taskDate,
											{ marginBottom: getResponsiveSize(10, 8, 6) },
										]}>
										<Ionicons
											name='calendar-outline'
											size={getResponsiveSize(18, 16, 14)}
											color='#666'
										/>
										<Text
											style={[
												styles.dateText,
												{
													fontSize: getResponsiveSize(14, 12, 11),
													marginLeft: getResponsiveSize(6, 4, 3),
												},
											]}>
											Muddat: {formatDate(task.due_date)}
										</Text>
									</View>

									{task.status === "overdue" ? (
										<View style={styles.warningContainer}>
											<Ionicons
												name='time-outline'
												size={getResponsiveSize(16, 14, 12)}
												color='#FF9800'
											/>
											<Text
												style={[
													styles.warningText,
													{
														fontSize: getResponsiveSize(14, 12, 11),
														marginLeft: getResponsiveSize(6, 4, 3),
													},
												]}>
												Muddat tugadi
											</Text>
										</View>
									) : (
										<View style={styles.warningContainer}>
											<Ionicons
												name='time-outline'
												size={getResponsiveSize(16, 14, 12)}
												color='#FF9800'
											/>
											<Text
												style={[
													styles.warningText,
													{
														fontSize: getResponsiveSize(14, 12, 11),
														marginLeft: getResponsiveSize(6, 4, 3),
													},
												]}>
												{isSmallScreen
													? "Muddat yaqin"
													: "Tez orada muddati tugaydi"}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							))
						) : (
							<View
								style={[
									styles.emptyStateContainer,
									{
										padding: getResponsiveSize(30, 20, 15),
										borderRadius: getResponsiveSize(16, 12, 10),
									},
								]}>
								<Ionicons
									name='calendar-outline'
									size={getResponsiveSize(48, 40, 32)}
									color='#DDD'
								/>
								<Text
									style={[
										styles.emptyStateText,
										{
											marginTop: getResponsiveSize(10, 8, 6),
											fontSize: getResponsiveSize(16, 14, 12),
										},
									]}>
									Hech qanday vazifa topilmadi
								</Text>
							</View>
						)}
					</View>

					{/* Recent Activity Section */}
					<View
						style={[
							styles.tasksSection,
							{
								padding: getResponsiveSize(20, 16, 12),
								marginTop: 0,
							},
						]}>
						<Text
							style={[
								styles.sectionTitle,
								{
									fontSize: getResponsiveSize(18, 16, 14),
									marginBottom: getResponsiveSize(16, 12, 10),
								},
							]}>
							So'nggi faollik
						</Text>

						{submittedTasks.length > 0 ? (
							submittedTasks.map((submission) => (
								<TouchableOpacity
									key={submission.id}
									style={[
										styles.activityCard,
										{
											padding: getResponsiveSize(16, 14, 12),
											marginBottom: getResponsiveSize(16, 12, 10),
											borderRadius: getResponsiveSize(16, 12, 10),
										},
									]}
									onPress={() => navigateToTask(submission.task_id)}>
									<View
										style={[
											styles.taskHeader,
											{ marginBottom: getResponsiveSize(12, 10, 8) },
										]}>
										<Text
											style={[
												styles.taskTitle,
												{
													fontSize: getResponsiveSize(18, 16, 14),
													marginBottom: getResponsiveSize(4, 3, 2),
												},
											]}>
											{submission.task_title}
										</Text>
										<Text
											style={[
												styles.taskGroup,
												{
													fontSize: getResponsiveSize(14, 12, 11),
													marginBottom: getResponsiveSize(2, 2, 1),
												},
											]}>
											{submission.group_name}
										</Text>
										<Text
											style={[
												styles.taskSubtitle,
												{ fontSize: getResponsiveSize(14, 12, 11) },
											]}>
											{submission.task_title.toLowerCase().includes("task")
												? submission.task_title
												: " erne javob"}
										</Text>
									</View>

									<View
										style={[
											styles.taskDate,
											{ marginBottom: getResponsiveSize(10, 8, 6) },
										]}>
										<Ionicons
											name='calendar-outline'
											size={getResponsiveSize(18, 16, 14)}
											color='#666'
										/>
										<Text
											style={[
												styles.dateText,
												{
													fontSize: getResponsiveSize(14, 12, 11),
													marginLeft: getResponsiveSize(6, 4, 3),
												},
											]}>
											{formatDate(submission.submitted_at)}
										</Text>
									</View>

									{submission.rating !== null &&
									submission.rating !== undefined ? (
										<View
											style={[
												styles.fileDownloadContainer,
												{
													padding: getResponsiveSize(8, 6, 4),
													borderRadius: getResponsiveSize(8, 6, 4),
												},
											]}>
											<Ionicons
												name='document-text-outline'
												size={getResponsiveSize(16, 14, 12)}
												color='#4169E1'
											/>
											<Text
												style={[
													styles.fileDownloadText,
													{
														fontSize: getResponsiveSize(14, 12, 11),
														marginLeft: getResponsiveSize(6, 4, 3),
													},
												]}>
												{isSmallScreen
													? "Faylni ko'rish"
													: "Yuborilgan faylni ko'rish"}
											</Text>
										</View>
									) : (
										<View
											style={[
												styles.fileDownloadContainer,
												{
													padding: getResponsiveSize(8, 6, 4),
													borderRadius: getResponsiveSize(8, 6, 4),
												},
											]}>
											<Ionicons
												name='document-text-outline'
												size={getResponsiveSize(16, 14, 12)}
												color='#4169E1'
											/>
											<Text
												style={[
													styles.fileDownloadText,
													{
														fontSize: getResponsiveSize(14, 12, 11),
														marginLeft: getResponsiveSize(6, 4, 3),
													},
												]}>
												{isSmallScreen
													? "Faylni ko'rish"
													: "Yuborilgan faylni ko'rish"}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							))
						) : (
							<View
								style={[
									styles.emptyStateContainer,
									{
										padding: getResponsiveSize(30, 20, 15),
										borderRadius: getResponsiveSize(16, 12, 10),
									},
								]}>
								<Ionicons
									name='document-text-outline'
									size={getResponsiveSize(48, 40, 32)}
									color='#DDD'
								/>
								<Text
									style={[
										styles.emptyStateText,
										{
											marginTop: getResponsiveSize(10, 8, 6),
											fontSize: getResponsiveSize(16, 14, 12),
										},
									]}>
									Hech qanday yuborilgan vazifa topilmadi
								</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</CustomBackground>
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
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	headerSection: {
		backgroundColor: "#4169E1",
		paddingTop: 60,
		paddingBottom: 30,
		paddingHorizontal: 20,
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30,
	},
	welcomeText: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
		marginBottom: 4,
	},
	roleText: {
		fontSize: 16,
		color: "rgba(255, 255, 255, 0.8)",
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		marginTop: -30,
	},
	statCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		width: "30%",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	statIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 8,
	},
	blueIcon: {
		backgroundColor: "rgba(65, 105, 225, 0.1)",
	},
	purpleIcon: {
		backgroundColor: "rgba(153, 102, 204, 0.1)",
	},
	greenIcon: {
		backgroundColor: "rgba(76, 175, 80, 0.1)",
	},
	statValue: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
	},
	statLabel: {
		fontSize: 12,
		color: "#666",
		textAlign: "center",
	},
	tasksSection: {
		padding: 20,
		marginTop: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	taskCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
	},
	activityCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
	},
	taskHeader: {
		marginBottom: 12,
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
		marginBottom: 2,
	},
	taskSubtitle: {
		fontSize: 14,
		color: "#999",
	},
	taskDate: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	dateText: {
		fontSize: 14,
		color: "#666",
		marginLeft: 6,
	},
	warningContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	warningText: {
		fontSize: 14,
		color: "#FF9800",
		marginLeft: 6,
	},
	fileDownloadContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#EBF1FF",
		padding: 8,
		borderRadius: 8,
	},
	fileDownloadText: {
		fontSize: 14,
		color: "#4169E1",
		marginLeft: 6,
	},
	emptyStateContainer: {
		alignItems: "center",
		justifyContent: "center",
		padding: 30,
		backgroundColor: "white",
		borderRadius: 16,
	},
	emptyStateText: {
		marginTop: 10,
		fontSize: 16,
		color: "#999",
		textAlign: "center",
	},
});
