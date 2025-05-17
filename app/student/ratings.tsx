import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	SafeAreaView,
	Image,
	RefreshControl,
	Alert,
	useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import CustomBackground from "@/components/CustomBackground";
import { icons } from "@/constants/icons";

type Group = {
	id: string;
	name: string;
};

type Student = {
	id: string;
	name: string;
	email: string;
	avatar_url: string | null;
	total_score: number;
	rank: number;
	average_score: number;
	completed_tasks: number;
};

type RatingTabState = {
	selectedGroup: string | null;
	groups: Group[];
	students: Student[];
	loading: boolean;
	refreshing: boolean;
};

export default function RatingsScreen() {
	const { user } = useAuth();
	const { width } = useWindowDimensions();
	const isSmallScreen = width < 375;

	const [state, setState] = useState<RatingTabState>({
		selectedGroup: null,
		groups: [],
		students: [],
		loading: true,
		refreshing: false,
	});

	// Fetch user's groups on component mount
	useEffect(() => {
		fetchUserGroups();
	}, []);

	// Fetch ratings when selected group changes
	useEffect(() => {
		if (state.selectedGroup) {
			fetchGroupRatings(state.selectedGroup);
		}
	}, [state.selectedGroup]);

	const fetchUserGroups = async () => {
		try {
			setState((prev) => ({ ...prev, loading: true }));

			// Get groups the student is a member of
			const { data: studentGroups, error: groupsError } = await supabase
				.from("group_students")
				.select(
					`
          group_id,
          groups:group_id(id, name)
        `
				)
				.eq("student_id", user?.id)
				.eq("status", "active");

			if (groupsError) throw groupsError;

			if (studentGroups && studentGroups.length > 0) {
				// Format groups data
				const groups = studentGroups.map((group) => ({
					id: group.groups.id,
					name: group.groups.name,
				}));

				// Set state with groups and select the first group
				setState((prev) => ({
					...prev,
					groups,
					selectedGroup: groups[0].id,
				}));
			} else {
				setState((prev) => ({ ...prev, loading: false }));
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
			setState((prev) => ({ ...prev, loading: false }));
			Alert.alert("Xatolik", "Guruhlarni yuklashda xatolik yuz berdi");
		}
	};

	const fetchGroupRatings = async (groupId: string) => {
		try {
			setState((prev) => ({ ...prev, loading: true }));

			// First, get all students in the group
			const { data: groupStudents, error: studentsError } = await supabase
				.from("group_students")
				.select("student_id")
				.eq("group_id", groupId)
				.eq("status", "active");

			if (studentsError) throw studentsError;

			if (!groupStudents || groupStudents.length === 0) {
				setState((prev) => ({
					...prev,
					students: [],
					loading: false,
				}));
				return;
			}

			// Get student IDs
			const studentIds = groupStudents.map((s) => s.student_id);

			// Now get student profiles separately using the IDs
			const { data: profilesData, error: profilesError } = await supabase
				.from("user_profiles")
				.select("id, name, email, avatar_url")
				.in("id", studentIds);

			if (profilesError) throw profilesError;

			// Get all tasks for this group
			const { data: tasks, error: tasksError } = await supabase
				.from("tasks")
				.select("id")
				.eq("group_id", groupId);

			if (tasksError) throw tasksError;

			if (!tasks || tasks.length === 0) {
				// No tasks, so no ratings
				const studentsWithNoScores = profilesData.map((profile, index) => ({
					id: profile.id,
					name: profile.name || profile.email.split("@")[0],
					email: profile.email,
					avatar_url: profile.avatar_url,
					total_score: 0,
					rank: index + 1,
					average_score: 0,
					completed_tasks: 0,
				}));

				setState((prev) => ({
					...prev,
					students: studentsWithNoScores,
					loading: false,
				}));
				return;
			}

			// Get task IDs
			const taskIds = tasks.map((task) => task.id);

			// For each student, get their submissions
			const studentScores = await Promise.all(
				profilesData.map(async (profile) => {
					// Get all submissions for this student for tasks in this group
					const { data: submissions, error: submissionsError } = await supabase
						.from("submissions")
						.select("rating, task_id")
						.eq("student_id", profile.id)
						.in("task_id", taskIds);

					if (submissionsError) throw submissionsError;

					// Calculate total and average score
					let totalScore = 0;
					const completedTasks = submissions ? submissions.length : 0;

					if (submissions) {
						submissions.forEach((submission) => {
							if (submission.rating) {
								totalScore += submission.rating;
							}
						});
					}

					const avgScore = completedTasks > 0 ? totalScore / completedTasks : 0;

					return {
						id: profile.id,
						name: profile.name || profile.email.split("@")[0],
						email: profile.email,
						avatar_url: profile.avatar_url,
						total_score: totalScore,
						average_score: avgScore,
						completed_tasks: completedTasks,
						rank: 0, // Will be set after sorting
					};
				})
			);

			// Sort by total score (descending)
			studentScores.sort((a, b) => b.total_score - a.total_score);

			// Assign ranks
			studentScores.forEach((student, index) => {
				student.rank = index + 1;
			});

			setState((prev) => ({
				...prev,
				students: studentScores,
				loading: false,
			}));
		} catch (error) {
			console.error("Error fetching group ratings:", error);
			setState((prev) => ({ ...prev, loading: false }));
			Alert.alert("Xatolik", "Reytinglarni yuklashda xatolik yuz berdi");
		}
	};

	const handleRefresh = () => {
		setState((prev) => ({ ...prev, refreshing: true }));
		if (state.selectedGroup) {
			fetchGroupRatings(state.selectedGroup).then(() => {
				setState((prev) => ({ ...prev, refreshing: false }));
			});
		} else {
			fetchUserGroups().then(() => {
				setState((prev) => ({ ...prev, refreshing: false }));
			});
		}
	};

	const renderStudentItem = ({
		item,
		index,
	}: {
		item: Student;
		index: number;
	}) => {
		const isCurrentUser = item.id === user?.id;
		// Background colors for top 3
		const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
		const rankColor = index < 3 ? rankColors[index] : "transparent";

		const avatarSize = isSmallScreen ? 32 : 40;

		return (
			<View
				style={[
					styles.studentCard,
					isCurrentUser && styles.currentUserCard,
					{ borderLeftColor: rankColor, borderLeftWidth: index < 3 ? 5 : 0 },
					isSmallScreen && styles.smallStudentCard,
				]}>
				<View style={styles.rankContainer}>
					<Text
						style={[styles.rankText, isSmallScreen && styles.smallRankText]}>
						{item.rank}
					</Text>
				</View>

				<View style={styles.avatarContainer}>
					{item.avatar_url ? (
						<Image
							source={{ uri: item.avatar_url }}
							style={[
								styles.avatar,
								{
									width: avatarSize,
									height: avatarSize,
									borderRadius: avatarSize / 2,
								},
							]}
						/>
					) : (
						<View
							style={[
								styles.avatarPlaceholder,
								{
									width: avatarSize,
									height: avatarSize,
									borderRadius: avatarSize / 2,
								},
							]}>
							<Text
								style={[
									styles.avatarLetter,
									isSmallScreen && styles.smallAvatarLetter,
								]}>
								{item.name ? item.name.charAt(0).toUpperCase() : "?"}
							</Text>
						</View>
					)}
				</View>

				<View style={styles.infoContainer}>
					<Text
						style={[
							styles.studentName,
							isSmallScreen && styles.smallStudentName,
						]}
						numberOfLines={1}>
						{item.name} {isCurrentUser && "(Siz)"}
					</Text>
					<Text
						style={[
							styles.completedText,
							isSmallScreen && styles.smallCompletedText,
						]}>
						{item.completed_tasks} topshiriq bajarilgan
					</Text>
				</View>

				<View style={styles.scoreContainer}>
					<Text
						style={[styles.scoreText, isSmallScreen && styles.smallScoreText]}>
						{Math.round(item.average_score)}
					</Text>
					<Text
						style={[
							styles.scoreLabel,
							isSmallScreen && styles.smallScoreLabel,
						]}>
						Ball
					</Text>
				</View>
			</View>
		);
	};

	const renderGroupTabs = () => {
		return (
			<View style={styles.groupTabsContainer}>
				<FlatList
					data={state.groups}
					horizontal
					showsHorizontalScrollIndicator={false}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={[
								styles.groupTab,
								state.selectedGroup === item.id && styles.selectedGroupTab,
								isSmallScreen && styles.smallGroupTab,
							]}
							onPress={() =>
								setState((prev) => ({ ...prev, selectedGroup: item.id }))
							}>
							<Text
								style={[
									styles.groupTabText,
									state.selectedGroup === item.id &&
										styles.selectedGroupTabText,
									isSmallScreen && styles.smallGroupTabText,
								]}>
								{item.name}
							</Text>
						</TouchableOpacity>
					)}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.groupTabsList}
				/>
			</View>
		);
	};

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<Ionicons
				name='trophy-outline'
				size={isSmallScreen ? 60 : 80}
				color='#D0D7F0'
			/>
			<Text
				style={[styles.emptyTitle, isSmallScreen && styles.smallEmptyTitle]}>
				Hech qanday reytinglar topilmadi
			</Text>
			<Text
				style={[
					styles.emptySubtitle,
					isSmallScreen && styles.smallEmptySubtitle,
				]}>
				Bu guruhda hali hech qanday baholar qo'yilmagan
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<CustomBackground image={icons.bg5} overlayColor='rgba(0,0,0,0.4)'>
				<View style={styles.header}>
					<Text
						style={[
							styles.headerTitle,
							isSmallScreen && styles.smallHeaderTitle,
						]}>
						Reyting
					</Text>
				</View>

				{state.groups.length > 0 && renderGroupTabs()}

				{state.loading && state.students.length === 0 ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#4169E1' />
					</View>
				) : (
					<FlatList
						data={state.students}
						renderItem={renderStudentItem}
						keyExtractor={(item) => item.id}
						contentContainerStyle={[
							styles.listContainer,
							isSmallScreen && styles.smallListContainer,
						]}
						ListEmptyComponent={renderEmptyList}
						refreshControl={
							<RefreshControl
								refreshing={state.refreshing}
								onRefresh={handleRefresh}
							/>
						}
					/>
				)}
			</CustomBackground>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
	},
	header: {
		backgroundColor: "#4169E1",
		paddingTop: 50,
		paddingBottom: 20,
		paddingHorizontal: 16,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	smallHeaderTitle: {
		fontSize: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	groupTabsContainer: {
		backgroundColor: "white",
		paddingVertical: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
		zIndex: 10,
	},
	groupTabsList: {
		paddingHorizontal: 16,
	},
	groupTab: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		marginRight: 10,
		backgroundColor: "#F0F2F5",
	},
	smallGroupTab: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		marginRight: 8,
	},
	selectedGroupTab: {
		backgroundColor: "#EEF2FF",
		borderColor: "#4169E1",
		borderWidth: 1,
	},
	groupTabText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#555",
	},
	smallGroupTabText: {
		fontSize: 12,
	},
	selectedGroupTabText: {
		color: "#4169E1",
		fontWeight: "600",
	},
	listContainer: {
		padding: 16,
		paddingBottom: 40,
	},
	smallListContainer: {
		padding: 12,
		paddingBottom: 30,
	},
	studentCard: {
		flexDirection: "row",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		alignItems: "center",
	},
	smallStudentCard: {
		padding: 8,
		marginBottom: 8,
		borderRadius: 10,
	},
	currentUserCard: {
		backgroundColor: "#EEF2FF",
		borderColor: "#4169E1",
		borderWidth: 1,
	},
	rankContainer: {
		width: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	rankText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
	},
	smallRankText: {
		fontSize: 14,
	},
	avatarContainer: {
		marginRight: 12,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#4169E1",
		justifyContent: "center",
		alignItems: "center",
	},
	avatarLetter: {
		fontSize: 20,
		fontWeight: "bold",
		color: "white",
	},
	smallAvatarLetter: {
		fontSize: 16,
	},
	infoContainer: {
		flex: 1,
		justifyContent: "center",
	},
	studentName: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 2,
	},
	smallStudentName: {
		fontSize: 14,
		marginBottom: 1,
	},
	completedText: {
		fontSize: 13,
		color: "#666",
	},
	smallCompletedText: {
		fontSize: 11,
	},
	scoreContainer: {
		alignItems: "center",
		minWidth: 50,
	},
	scoreText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#4169E1",
	},
	smallScoreText: {
		fontSize: 16,
	},
	scoreLabel: {
		fontSize: 12,
		color: "#666",
	},
	smallScoreLabel: {
		fontSize: 10,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 80,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
		marginBottom: 8,
	},
	smallEmptyTitle: {
		fontSize: 18,
		marginTop: 12,
		marginBottom: 6,
	},
	emptySubtitle: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 22,
	},
	smallEmptySubtitle: {
		fontSize: 14,
		lineHeight: 20,
	},
});
