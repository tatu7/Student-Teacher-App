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
	Modal,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { format } from "date-fns";

// Types
type Group = {
	id: string;
	name: string;
	description: string | null;
	teacher_id: string;
	created_at: string;
	teacher_name?: string;
	pending_tasks?: number;
	completed_tasks?: number;
	expanded?: boolean;
};

type Task = {
	id: string;
	title: string;
	due_date: string;
	description?: string;
	completed?: boolean;
	has_files?: boolean;
};

export default function StudentGroupsScreen() {
	const { user } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [tasks, setTasks] = useState<{ [groupId: string]: Task[] }>({});
	const [joinModalVisible, setJoinModalVisible] = useState(false);
	const [groupIdInput, setGroupIdInput] = useState("");
	const [joiningGroup, setJoiningGroup] = useState(false);

	useEffect(() => {
		fetchGroups();
	}, []);

	const fetchGroups = async () => {
		try {
			if (!user) return;
			setLoading(true);

			// Get groups where student is a member
			const { data, error } = await supabase
				.from("group_students")
				.select(
					`
					group_id,
					groups:group_id(
						id, 
						name, 
						description,
						teacher_id, 
						created_at
					)
				`
				)
				.eq("student_id", user.id);

			if (error) throw error;

			if (!data || data.length === 0) {
				setGroups([]);
				setLoading(false);
				return;
			}

			// Transform data and get teacher names
			const groupsData = data.map((item) => ({
				...(item.groups as Group),
				expanded: false,
			}));

			// Get teacher names for each group
			const teacherIds = [
				...new Set(groupsData.map((group) => group.teacher_id)),
			];

			// Fetch teacher profiles
			let groupsWithTeachers: Group[] = [...groupsData];
			if (teacherIds.length > 0) {
				const { data: teachersData, error: teachersError } = await supabase
					.from("user_profiles")
					.select("id, name, display_name")
					.in("id", teacherIds);

				if (teachersError) {
					console.error("Error fetching teacher profiles:", teachersError);
				} else if (teachersData) {
					// Add teacher names to groups
					groupsWithTeachers = groupsData.map((group) => {
						const teacher = teachersData.find((t) => t.id === group.teacher_id);
						return {
							...group,
							teacher_name: teacher
								? teacher.display_name || teacher.name || "O'qituvchi"
								: "O'qituvchi",
						};
					});
				}
			}

			// Fetch task counts for each group
			const groupIds = groupsWithTeachers.map((group) => group.id);

			// Get tasks for all these groups
			if (groupIds.length > 0) {
				const { data: tasksData, error: tasksError } = await supabase
					.from("tasks")
					.select("id, group_id, title, description, due_date, has_files")
					.in("group_id", groupIds);

				if (tasksError) {
					console.error("Error fetching tasks:", tasksError);
				} else if (tasksData) {
					// Get submissions for this student
					const { data: submissionsData, error: submissionsError } =
						await supabase
							.from("submissions")
							.select("id, task_id")
							.eq("student_id", user.id);

					if (submissionsError) {
						console.error("Error fetching submissions:", submissionsError);
					} else {
						// Calculate task stats for each group
						const groupsWithTaskStats = groupsWithTeachers.map((group) => {
							// Get tasks for this group
							const groupTasks = tasksData.filter(
								(task) => task.group_id === group.id
							);

							// Check which tasks have submissions
							const completedTaskIds = submissionsData
								? submissionsData.map((sub) => sub.task_id)
								: [];

							const completedTasks = groupTasks.filter((task) =>
								completedTaskIds.includes(task.id)
							).length;

							const pendingTasks = groupTasks.length - completedTasks;

							return {
								...group,
								pending_tasks: pendingTasks,
								completed_tasks: completedTasks,
							};
						});

						setGroups(groupsWithTaskStats);

						// Organize tasks by group_id and mark completed ones
						const tasksByGroup: { [groupId: string]: Task[] } = {};
						groupIds.forEach((groupId) => {
							const groupTasks = tasksData
								.filter((task) => task.group_id === groupId)
								.map((task) => ({
									id: task.id,
									title: task.title,
									due_date: task.due_date,
									description: task.description,
									has_files: task.has_files,
									completed: submissionsData
										? submissionsData.some((sub) => sub.task_id === task.id)
										: false,
								}));
							tasksByGroup[groupId] = groupTasks;
						});
						setTasks(tasksByGroup);
					}
				}
			} else {
				setGroups(groupsWithTeachers);
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
			Alert.alert("Xatolik", "Guruhlarni yuklashda muammo yuzaga keldi");
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroupDetails = (groupId: string, groupName: string) => {
		router.push({
			pathname: "/student/groups/[id]",
			params: { id: groupId, name: groupName },
		});
	};

	const formatDate = (dateString: string) => {
		try {
			return `Yaratilgan: ${format(new Date(dateString), "MMM d, yyyy")}`;
		} catch (e) {
			return "Yaratilgan: Sana noma'lum";
		}
	};

	const formatTaskDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return `Muddat: ${format(date, "MMMM d, yyyy")}`;
		} catch (e) {
			return "Muddat: -";
		}
	};

	const toggleGroupExpanded = (groupId: string) => {
		setGroups((prevGroups) =>
			prevGroups.map((group) =>
				group.id === groupId ? { ...group, expanded: !group.expanded } : group
			)
		);
	};

	const renderTaskItem = (task: Task) => (
		<TouchableOpacity
			key={task.id}
			style={styles.taskItem}
			onPress={() => navigateToTaskDetails(task.id, task.title)}>
			<View style={styles.taskItemLeftSection}>
				<View style={styles.taskIconContainer}>
					{task.completed ? (
						<Ionicons name='checkmark-circle' size={18} color='#4CAF50' />
					) : (
						<Ionicons name='time-outline' size={18} color='#FF9800' />
					)}
				</View>
				<View style={styles.taskDetails}>
					<Text style={styles.taskTitle} numberOfLines={1}>
						{task.title}
					</Text>
					<View style={styles.taskDateContainer}>
						<Ionicons name='calendar-outline' size={14} color='#777' />
						<Text style={styles.taskDate}>
							{formatTaskDate(task.due_date).replace("Muddat: ", "")}
						</Text>
					</View>
				</View>
			</View>

			{task.has_files && (
				<View style={styles.taskFileIndicator}>
					<Ionicons name='document-text' size={16} color='#4169E1' />
				</View>
			)}
		</TouchableOpacity>
	);

	const renderGroupItem = ({ item }: { item: Group }) => {
		const groupTasks = tasks[item.id] || [];
		const displayTasks = item.expanded ? groupTasks.slice(0, 3) : [];
		const hasMoreTasks = groupTasks.length > 3;

		return (
			<View style={styles.groupSection}>
				<TouchableOpacity
					style={styles.groupCard}
					// onPress={() => navigateToGroupDetails(item.id, item.name)}
				>
					<View style={styles.groupContent}>
						<View style={styles.groupIconContainer}>
							<Ionicons name='people' size={28} color='#4169E1' />
						</View>

						<View style={styles.groupDetails}>
							<Text style={styles.groupName}>{item.name}</Text>
							<Text style={styles.groupDescription}>
								{item.description || item.name.toLowerCase()}
							</Text>
							<Text style={styles.dateText}>{formatDate(item.created_at)}</Text>

							{/* Task Stats */}
							<View style={styles.taskStats}>
								{item.pending_tasks !== undefined && (
									<View style={styles.taskStat}>
										<Ionicons name='time-outline' size={14} color='#FF9800' />
										<Text style={styles.pendingTasksText}>
											{item.pending_tasks} vazifa
										</Text>
									</View>
								)}

								{item.completed_tasks !== undefined && (
									<View style={styles.taskStat}>
										<Ionicons
											name='checkmark-circle-outline'
											size={14}
											color='#4CAF50'
										/>
										<Text style={styles.completedTasksText}>
											{item.completed_tasks} bajarilgan
										</Text>
									</View>
								)}
							</View>
						</View>
					</View>

					<Ionicons
						name='chevron-forward'
						size={24}
						color='#C0C0C0'
						style={styles.arrowIcon}
					/>
				</TouchableOpacity>

				{/* Tasks section for this group */}
				<View style={styles.tasksSectionContainer}>
					<TouchableOpacity
						style={[
							styles.tasksHeaderRow,
							item.expanded && {
								borderBottomWidth: 1,
								borderBottomColor: "#f0f0f0",
							},
						]}
						onPress={() => toggleGroupExpanded(item.id)}>
						<Text style={styles.tasksSectionTitle}>
							Vazifalar ({groupTasks.length})
						</Text>
						<Ionicons
							name={item.expanded ? "chevron-down" : "chevron-forward"}
							size={18}
							color='#000'
						/>
					</TouchableOpacity>

					{item.expanded && (
						<View style={styles.tasksExpandedContent}>
							{displayTasks.length > 0 ? (
								<>
									{displayTasks.map((task) => renderTaskItem(task))}

									{hasMoreTasks && (
										<TouchableOpacity
											style={styles.seeAllButton}
											onPress={() =>
												navigateToGroupDetails(item.id, item.name)
											}>
											<Text style={styles.seeAllText}>Hammasini ko'rish</Text>
										</TouchableOpacity>
									)}
								</>
							) : (
								<View style={styles.emptyTasksContainer}>
									<Text style={styles.emptyTasksText}>
										Bu guruh uchun vazifalar mavjud emas
									</Text>
								</View>
							)}
						</View>
					)}
				</View>
			</View>
		);
	};

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='people-outline' size={70} color='#D0D7F0' />
			<Text style={styles.emptyText}>Guruhlar topilmadi</Text>
			<Text style={styles.emptySubtext}>
				Hozircha siz hech qanday guruhga qo'shilmagansiz
			</Text>
		</View>
	);

	const openJoinModal = () => {
		setGroupIdInput("");
		setJoinModalVisible(true);
	};

	const closeJoinModal = () => {
		setJoinModalVisible(false);
	};

	const handleJoinGroup = async () => {
		// Validate input
		if (!groupIdInput.trim()) {
			Alert.alert("Xato", "Iltimos guruh ID sini kiriting");
			return;
		}

		try {
			setJoiningGroup(true);

			// Validate UUID format using regex
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(groupIdInput.trim())) {
				Alert.alert(
					"Xato",
					"ID noto'g'ri formatda. Iltimos to'g'ri guruh ID sini kiriting"
				);
				setJoiningGroup(false);
				return;
			}

			// First check if the group exists
			const { data: groupData, error: groupError } = await supabase
				.from("groups")
				.select("id, name")
				.eq("id", groupIdInput.trim())
				.single();

			if (groupError || !groupData) {
				console.error("Error checking group:", groupError);
				Alert.alert("Xato", "Bunday ID bilan guruh topilmadi");
				setJoiningGroup(false);
				return;
			}

			// Get the user's email if not available in user object
			let userEmail = user?.email;

			if (!userEmail) {
				const { data: userData, error: userError } = await supabase
					.from("user_profiles")
					.select("email")
					.eq("id", user?.id)
					.single();

				if (userError) {
					console.error("Error fetching user email:", userError);
					Alert.alert("Xato", "Foydalanuvchi ma'lumotlarini olishda xatolik");
					setJoiningGroup(false);
					return;
				}

				userEmail = userData?.email;
			}

			if (!userEmail) {
				Alert.alert("Xato", "Foydalanuvchi email manzili topilmadi");
				setJoiningGroup(false);
				return;
			}

			// Check if the student is already a member
			try {
				const { data: existingMembers, error: memberError } = await supabase
					.from("group_students")
					.select("id")
					.eq("group_id", groupIdInput.trim())
					.eq("student_id", user?.id);

				if (memberError) {
					console.error("Error checking membership:", memberError);
				}

				if (existingMembers && existingMembers.length > 0) {
					Alert.alert("Ogohlantirish", "Siz allaqachon bu guruhga a'zosiz");
					setJoiningGroup(false);
					closeJoinModal();
					return;
				}
			} catch (memberCheckError) {
				console.error("Error in membership check:", memberCheckError);
				// Continue with join attempt even if membership check fails
			}

			// Add the student to the group
			const { error: joinError } = await supabase
				.from("group_students")
				.insert({
					group_id: groupIdInput.trim(),
					student_id: user?.id,
					student_email: userEmail,
				});

			if (joinError) {
				console.error("Error joining group:", joinError);
				Alert.alert("Xato", "Guruhga qo'shilishda xatolik yuz berdi");
				setJoiningGroup(false);
				return;
			}

			// Close the modal and refresh the groups list
			closeJoinModal();
			await fetchGroups();

			// Show a success message
			Alert.alert("Muvaffaqiyat", `"${groupData.name}" guruhiga qo'shildingiz`);
		} catch (error) {
			console.error("Error joining group:", error);
			Alert.alert("Xato", "Guruhga qo'shilishda xatolik yuz berdi");
		} finally {
			setJoiningGroup(false);
		}
	};

	const navigateToTaskDetails = (taskId: string, taskTitle: string) => {
		router.push({
			pathname: "/student/tasks/[id]",
			params: {
				id: taskId,
				name: taskTitle,
			},
		});
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>

			<View style={styles.header}>
				<Text style={styles.headerTitle}>Mening guruhlarim</Text>
				<TouchableOpacity style={styles.headerButton} onPress={openJoinModal}>
					<Ionicons name='add' size={24} color='white' />
				</TouchableOpacity>
			</View>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			) : (
				<FlatList
					data={groups}
					renderItem={renderGroupItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyList}
					refreshing={loading}
					onRefresh={fetchGroups}
				/>
			)}

			{/* Join Group Modal */}
			<Modal
				animationType='slide'
				transparent={true}
				visible={joinModalVisible}
				onRequestClose={closeJoinModal}>
				<TouchableWithoutFeedback onPress={closeJoinModal}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
							<View style={styles.modalContent}>
								<Text style={styles.modalTitle}>Guruhga Qo'shilish</Text>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Guruh ID</Text>
									<TextInput
										style={styles.input}
										placeholder="O'qituvchi bergan guruh ID sini kiriting"
										value={groupIdInput}
										onChangeText={setGroupIdInput}
										autoCapitalize='none'
									/>
								</View>

								<View style={styles.modalButtons}>
									<TouchableOpacity
										style={styles.cancelButton}
										onPress={closeJoinModal}>
										<Text style={styles.cancelButtonText}>Bekor qilish</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={styles.joinButton}
										onPress={handleJoinGroup}
										disabled={joiningGroup}>
										{joiningGroup ? (
											<ActivityIndicator size='small' color='#fff' />
										) : (
											<Text style={styles.joinButtonText}>Qo'shilish</Text>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
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
		paddingHorizontal: 20,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	headerButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		justifyContent: "center",
		alignItems: "center",
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
	groupSection: {
		marginBottom: 16,
	},
	groupCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		marginBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	groupContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	groupIconContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#EEF6FF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	groupDetails: {
		flex: 1,
	},
	groupName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	groupDescription: {
		fontSize: 14,
		color: "#666",
		marginBottom: 6,
	},
	dateText: {
		fontSize: 12,
		color: "#888",
		marginBottom: 8,
	},
	taskStats: {
		flexDirection: "row",
		marginTop: 2,
	},
	taskStat: {
		flexDirection: "row",
		alignItems: "center",
		marginRight: 12,
	},
	pendingTasksText: {
		fontSize: 12,
		color: "#FF9800",
		marginLeft: 4,
	},
	completedTasksText: {
		fontSize: 12,
		color: "#4CAF50",
		marginLeft: 4,
	},
	arrowIcon: {
		marginLeft: 10,
	},
	// Task section styles
	tasksSectionContainer: {
		backgroundColor: "white",
		borderRadius: 12,
		overflow: "hidden",
	},
	tasksHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 0,
	},
	tasksSectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	tasksExpandedContent: {
		padding: 8,
	},
	taskItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: "#F8F9FD",
		marginBottom: 8,
	},
	taskItemLeftSection: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	taskIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#E8F0FE",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	taskDetails: {
		flex: 1,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "500",
		color: "#333",
		marginBottom: 4,
	},
	taskDateContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	taskDate: {
		fontSize: 14,
		color: "#777",
		marginLeft: 4,
	},
	taskFileIndicator: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#E8F0FE",
		justifyContent: "center",
		alignItems: "center",
	},
	seeAllButton: {
		padding: 12,
		alignItems: "center",
	},
	seeAllText: {
		color: "#4169E1",
		fontWeight: "500",
	},
	emptyTasksContainer: {
		padding: 16,
		alignItems: "center",
	},
	emptyTasksText: {
		color: "#777",
		fontSize: 14,
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
	},
	// Modal styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: "white",
		borderRadius: 20,
		padding: 20,
		width: "85%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: "#333",
		marginBottom: 20,
		textAlign: "center",
	},
	inputGroup: {
		marginBottom: 20,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
	},
	modalButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
	},
	cancelButton: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#4169E1",
		borderRadius: 8,
		padding: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	cancelButtonText: {
		color: "#4169E1",
		fontSize: 16,
		fontWeight: "600",
	},
	joinButton: {
		flex: 1,
		backgroundColor: "#4169E1",
		borderRadius: 8,
		padding: 12,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
	joinButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
