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
	Clipboard,
	Platform,
	Modal,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { format } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import { pickDocument, uploadTaskFile, FileInfo } from "../../../lib/files";
import FilePicker from "../../../components/FilePicker";

// Types
type Group = {
	id: string;
	name: string;
	created_at: string;
	student_count: number;
	expanded?: boolean;
	description?: string | null;
};

type Task = {
	id: string;
	title: string;
	due_date: string;
	description?: string;
	has_files?: boolean;
};

export default function GroupsScreen() {
	const { user } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [tasks, setTasks] = useState<{ [groupId: string]: Task[] }>({});
	const [modalVisible, setModalVisible] = useState(false);
	const [newGroupName, setNewGroupName] = useState("");
	const [newGroupDescription, setNewGroupDescription] = useState("");
	const [creatingGroup, setCreatingGroup] = useState(false);

	// Task creation states
	const [taskModalVisible, setTaskModalVisible] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	const [taskTitle, setTaskTitle] = useState("");
	const [taskDescription, setTaskDescription] = useState("");
	const [taskDueDate, setTaskDueDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [taskLoading, setTaskLoading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
	const [fileUploading, setFileUploading] = useState(false);

	useEffect(() => {
		fetchGroups();
	}, []);

	const fetchGroups = async () => {
		try {
			setLoading(true);

			// Fetch groups created by the current teacher
			if (!user) return;

			// This query joins the groups table with group_students to get student counts
			const { data, error } = await supabase
				.from("groups")
				.select(
					`
          id, 
          name, 
          description,
          created_at,
          group_students:group_students(count)
        `
				)
				.eq("teacher_id", user.id)
				.order("created_at", { ascending: false });

			if (error) throw error;

			// Process the data to get student counts
			const processedGroups = data.map((group) => ({
				id: group.id,
				name: group.name,
				description: group.description,
				created_at: group.created_at,
				student_count: group.group_students[0]?.count || 0,
				expanded: false,
			}));

			setGroups(processedGroups);

			// Fetch tasks for all groups
			if (processedGroups.length > 0) {
				await fetchTasksForGroups(processedGroups.map((g) => g.id));
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
			Alert.alert("Error", "Failed to load groups");
		} finally {
			setLoading(false);
		}
	};

	const fetchTasksForGroups = async (groupIds: string[]) => {
		if (groupIds.length === 0) return;

		try {
			// Fetch tasks for all groups from Supabase
			const { data, error } = await supabase
				.from("tasks")
				.select(
					`
					id,
					group_id,
					title,
					due_date,
					description,
					has_files
				`
				)
				.in("group_id", groupIds)
				.order("due_date", { ascending: false });

			if (error) {
				console.error("Error fetching tasks:", error);
				return;
			}

			// Group tasks by group_id
			const tasksByGroup: { [groupId: string]: Task[] } = {};

			// Initialize empty arrays for all groups
			groupIds.forEach((groupId) => {
				tasksByGroup[groupId] = [];
			});

			// Populate tasks for each group
			data.forEach((task) => {
				if (task.group_id && tasksByGroup[task.group_id]) {
					tasksByGroup[task.group_id].push({
						id: task.id,
						title: task.title,
						due_date: task.due_date,
						description: task.description,
						has_files: task.has_files,
					});
				}
			});

			setTasks(tasksByGroup);
		} catch (error) {
			console.error("Error fetching tasks:", error);
		}
	};

	const openCreateModal = () => {
		setNewGroupName("");
		setNewGroupDescription("");
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
	};

	const openTaskModal = (group: Group) => {
		setSelectedGroup(group);
		setTaskTitle("");
		setTaskDescription("");
		setTaskDueDate(new Date());
		setSelectedFile(null);
		setTaskModalVisible(true);
	};

	const closeTaskModal = () => {
		setTaskModalVisible(false);
		setSelectedGroup(null);
	};

	const handleDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false);
		if (selectedDate) {
			setTaskDueDate(selectedDate);
		}
	};

	const handleCreateTask = async () => {
		// Validate input
		if (!taskTitle.trim()) {
			Alert.alert("Xato", "Iltimos vazifa sarlavhasini kiriting");
			return;
		}

		if (!taskDescription.trim()) {
			Alert.alert("Xato", "Iltimos vazifa tavsifini kiriting");
			return;
		}

		if (!selectedGroup) {
			Alert.alert("Xato", "Guruh tanlanmagan");
			return;
		}

		try {
			setTaskLoading(true);

			// Create task in the database
			const { data: taskData, error: taskError } = await supabase
				.from("tasks")
				.insert({
					title: taskTitle,
					description: taskDescription,
					due_date: taskDueDate.toISOString(),
					group_id: selectedGroup.id,
					teacher_id: user?.id,
					has_files: !!selectedFile, // Set has_files flag
				})
				.select()
				.single();

			if (taskError) throw taskError;

			// Upload file if one was selected
			let filePath = null;
			if (selectedFile) {
				setFileUploading(true);
				try {
					filePath = await uploadTaskFile(taskData.id, selectedFile);

					// Record file in task_files table
					if (filePath) {
						const { error: fileError } = await supabase
							.from("task_files")
							.insert({
								task_id: taskData.id,
								file_path: filePath,
								file_name: selectedFile.name,
								file_type: selectedFile.type,
								file_size: selectedFile.size,
							});

						if (fileError) {
							console.error("Error recording file:", fileError);
							// Continue even if there was an error recording the file
						}
					}
				} catch (uploadError) {
					console.error("Error uploading file:", uploadError);
					Alert.alert(
						"Ogohlantirish",
						"Vazifa yaratildi, lekin faylni yuklashda muammo yuzaga keldi."
					);
				} finally {
					setFileUploading(false);
				}
			}

			// Close modal and refresh tasks
			closeTaskModal();
			await fetchTasksForGroups([selectedGroup.id]);

			// Show success message
			Alert.alert("Muvaffaqiyat", "Vazifa muvaffaqiyatli yaratildi");
		} catch (error) {
			console.error("Error creating task:", error);
			Alert.alert("Xato", "Vazifa yaratishda xatolik yuz berdi");
		} finally {
			setTaskLoading(false);
		}
	};

	const handlePickFile = async () => {
		try {
			const file = await pickDocument();
			if (file) {
				setSelectedFile(file);
			}
		} catch (error) {
			console.error("Error picking file:", error);
			Alert.alert("Xato", "Faylni tanlashda xatolik yuz berdi");
		}
	};

	const handleCreateGroup = async () => {
		// Validate input
		if (!newGroupName.trim()) {
			Alert.alert("Xato", "Iltimos guruh nomini kiriting");
			return;
		}

		try {
			setCreatingGroup(true);

			// Create the group with name and description
			const { data: groupData, error: groupError } = await supabase
				.from("groups")
				.insert({
					name: newGroupName.trim(),
					description: newGroupDescription.trim() || null,
					teacher_id: user?.id,
				})
				.select();

			if (groupError) throw groupError;

			// Close the modal and refresh the groups list
			closeModal();
			await fetchGroups();

			// Show a success message
			Alert.alert("Muvaffaqiyat", "Guruh muvaffaqiyatli yaratildi");
		} catch (error) {
			console.error("Error creating group:", error);
			Alert.alert("Xato", "Guruh yaratishda xatolik yuz berdi");
		} finally {
			setCreatingGroup(false);
		}
	};

	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return `Yaratilgan: ${format(date, "MMM d, yyyy")}`;
		} catch (e) {
			return "Yaratilgan: -";
		}
	};

	const formatTaskDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return format(date, "d-MMM, yyyy");
		} catch (e) {
			return "-";
		}
	};

	const shortenId = (id: string) => {
		if (id && id.length > 20) {
			return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
		}
		return id;
	};

	const copyToClipboard = (id: string) => {
		Clipboard.setString(id);
		Alert.alert("ID nusxalandi", `ID: ${id}`);
	};

	const toggleGroupExpanded = (groupId: string) => {
		setGroups((prevGroups) =>
			prevGroups.map((group) =>
				group.id === groupId ? { ...group, expanded: !group.expanded } : group
			)
		);
	};

	const navigateToViewAllTasks = (groupId: string, groupName: string) => {
		// You can implement navigation to a tasks list page
		router.push({
			pathname: "/teacher/groups/[id]",
			params: { id: groupId, name: groupName, tab: "tasks" },
		});
	};

	const renderTaskItem = (task: Task) => (
		<View key={task.id} style={styles.taskItem}>
			<View style={styles.taskIconContainer}>
				<Ionicons
					name={task.has_files ? "document-text" : "document-text-outline"}
					size={20}
					color='#4285F4'
				/>
			</View>
			<View style={styles.taskDetails}>
				<Text style={styles.taskTitle}>{task.title}</Text>
				<Text style={styles.taskDate}>
					Vazifa: {formatTaskDate(task.due_date)}
				</Text>
			</View>
		</View>
	);

	const renderGroupItem = ({ item }: { item: Group }) => {
		const groupTasks = tasks[item.id] || [];
		const displayTasks = item.expanded ? groupTasks.slice(0, 3) : [];
		const hasMoreTasks = groupTasks.length > 3;

		return (
			<View style={styles.groupSection}>
				<TouchableOpacity
					style={styles.groupCard}
					onPress={() => openTaskModal(item)}>
					<View style={styles.userIconContainer}>
						<Ionicons name='person-outline' size={24} color='#4285F4' />
					</View>
					<View style={styles.groupInfo}>
						<Text style={styles.groupName}>{item.name}</Text>
						{item.description ? (
							<Text style={styles.groupDescription} numberOfLines={2}>
								{item.description}
							</Text>
						) : null}
						<Text style={styles.groupDate}>{formatDate(item.created_at)}</Text>
						<TouchableOpacity
							style={styles.idContainer}
							onPress={(e) => {
								e.stopPropagation();
								copyToClipboard(item.id);
							}}>
							<Text style={styles.groupId}>ID: {shortenId(item.id)}</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>

				{/* Tasks section for this specific group */}
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
												navigateToViewAllTasks(item.id, item.name)
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
			<Ionicons name='people-outline' size={60} color='#ccc' />
			<Text style={styles.emptyText}>Guruhlar topilmadi</Text>
			<Text style={styles.emptySubtext}>
				Birinchi guruh yaratish uchun bosing
			</Text>
			<TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
				<Text style={styles.createButtonText}>Guruh yaratish</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Mening guruhlarim</Text>
					<TouchableOpacity
						onPress={openCreateModal}
						style={styles.headerButton}>
						<Ionicons name='add' size={24} color='white' />
					</TouchableOpacity>
				</View>

				{loading ? (
					<View style={styles.loaderContainer}>
						<ActivityIndicator size='large' color='#4285F4' />
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

				{/* Group Creation Modal */}
				<Modal
					animationType='slide'
					transparent={true}
					visible={modalVisible}
					onRequestClose={closeModal}>
					<TouchableWithoutFeedback onPress={closeModal}>
						<View style={styles.modalOverlay}>
							<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
								<View style={styles.modalContent}>
									<Text style={styles.modalTitle}>Yangi guruh yaratish</Text>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Guruh nomi</Text>
										<TextInput
											style={styles.input}
											placeholder='Guruh nomini kiriting'
											value={newGroupName}
											onChangeText={setNewGroupName}
											autoCapitalize='words'
										/>
									</View>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Tavsif (Ixtiyoriy)</Text>
										<TextInput
											style={[styles.input, styles.multilineInput]}
											placeholder='Guruh tavsifini kiriting'
											value={newGroupDescription}
											onChangeText={setNewGroupDescription}
											multiline
											numberOfLines={4}
										/>
									</View>

									<View style={styles.modalButtons}>
										<TouchableOpacity
											style={styles.cancelButton}
											onPress={closeModal}>
											<Text style={styles.cancelButtonText}>Bekor qilish</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={styles.createModalButton}
											onPress={handleCreateGroup}
											disabled={creatingGroup}>
											{creatingGroup ? (
												<ActivityIndicator size='small' color='#fff' />
											) : (
												<Text style={styles.createModalButtonText}>
													Yaratish
												</Text>
											)}
										</TouchableOpacity>
									</View>
								</View>
							</TouchableWithoutFeedback>
						</View>
					</TouchableWithoutFeedback>
				</Modal>

				{/* Task Creation Modal */}
				<Modal
					animationType='slide'
					transparent={true}
					visible={taskModalVisible}
					onRequestClose={closeTaskModal}>
					<TouchableWithoutFeedback onPress={closeTaskModal}>
						<View style={styles.modalOverlay}>
							<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
								<View style={styles.modalContent}>
									<Text style={styles.modalTitle}>Yangi vazifa yaratish</Text>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Vazifa nomi</Text>
										<TextInput
											style={styles.input}
											placeholder='Vazifa nomini kiriting'
											value={taskTitle}
											onChangeText={setTaskTitle}
										/>
									</View>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Tavsif (Ixtiyoriy)</Text>
										<TextInput
											style={[styles.input, styles.multilineInput]}
											placeholder='Vazifa tavsifini kiriting'
											value={taskDescription}
											onChangeText={setTaskDescription}
											multiline
											numberOfLines={4}
										/>
									</View>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Muddati</Text>
										<TouchableOpacity
											style={styles.datePickerButton}
											onPress={() => setShowDatePicker(true)}>
											<Text style={styles.dateText}>
												{taskDueDate.toISOString().split("T")[0]}
											</Text>
										</TouchableOpacity>

										{showDatePicker && (
											<DateTimePicker
												value={taskDueDate}
												mode='date'
												display='default'
												onChange={handleDateChange}
											/>
										)}
									</View>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Fayl (Ixtiyoriy)</Text>
										<TouchableOpacity
											style={styles.filePickerButton}
											onPress={handlePickFile}>
											<Ionicons
												name='cloud-upload-outline'
												size={20}
												color='#4285F4'
											/>
											<Text style={styles.filePickerText}>
												{selectedFile
													? selectedFile.name
													: "Fayl qo'shish (PDF yoki DOCX)"}
											</Text>
										</TouchableOpacity>
									</View>

									<View style={styles.modalButtons}>
										<TouchableOpacity
											style={styles.cancelButton}
											onPress={closeTaskModal}>
											<Text style={styles.cancelButtonText}>Bekor qilish</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={styles.createModalButton}
											onPress={handleCreateTask}
											disabled={taskLoading || fileUploading}>
											{taskLoading || fileUploading ? (
												<ActivityIndicator size='small' color='#fff' />
											) : (
												<Text style={styles.createModalButtonText}>
													Vazifa yaratish
												</Text>
											)}
										</TouchableOpacity>
									</View>
								</View>
							</TouchableWithoutFeedback>
						</View>
					</TouchableWithoutFeedback>
				</Modal>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#4285F4",
		marginTop: 32,
	},
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: "#4285F4",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "white",
	},
	headerButton: {
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "white",
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
		borderRadius: 12,
		padding: 16,
		flexDirection: "row",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
		marginBottom: 8,
	},
	userIconContainer: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "#E8F0FE",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	groupInfo: {
		flex: 1,
		justifyContent: "center",
	},
	groupName: {
		fontSize: 20,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	groupDate: {
		fontSize: 14,
		color: "#777",
		marginBottom: 8,
	},
	idContainer: {
		backgroundColor: "#E8F0FE",
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 4,
		alignSelf: "flex-start",
	},
	groupId: {
		fontSize: 12,
		color: "#4285F4",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
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
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
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
		marginBottom: 2,
	},
	taskDate: {
		fontSize: 12,
		color: "#777",
	},
	seeAllButton: {
		padding: 12,
		alignItems: "center",
	},
	seeAllText: {
		color: "#4285F4",
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
		marginBottom: 24,
	},
	createButton: {
		backgroundColor: "#4285F4",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	createButtonText: {
		color: "white",
		fontWeight: "bold",
	},
	// Modal styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		minHeight: "50%",
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "#333",
		marginBottom: 20,
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
	multilineInput: {
		minHeight: 100,
		textAlignVertical: "top",
	},
	modalButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
	},
	cancelButton: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#4285F4",
		borderRadius: 8,
		padding: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	cancelButtonText: {
		color: "#4285F4",
		fontSize: 16,
		fontWeight: "600",
	},
	createModalButton: {
		flex: 1,
		backgroundColor: "#4285F4",
		borderRadius: 8,
		padding: 12,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 8,
	},
	createModalButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	groupDescription: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},

	// Date picker styles
	datePickerButton: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		backgroundColor: "#f9f9f9",
	},
	dateText: {
		fontSize: 16,
		color: "#333",
	},

	// File picker styles
	filePickerButton: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		backgroundColor: "#f9f9f9",
		flexDirection: "row",
		alignItems: "center",
	},
	filePickerText: {
		fontSize: 16,
		color: "#333",
		marginLeft: 8,
	},
});
