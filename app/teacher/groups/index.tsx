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
	useWindowDimensions,
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
	file_info?: {
		name: string;
		path: string;
	} | null;
};

export default function GroupsScreen() {
	const { user } = useAuth();
	const { width } = useWindowDimensions();
	const isSmallScreen = width < 375;
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

	// Add states for editing tasks
	const [isEditMode, setIsEditMode] = useState(false);
	const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

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
			const taskPromises = data.map(async (task) => {
				let fileInfo = null;

				// Get file info for tasks with files
				if (task.has_files) {
					try {
						const { data: fileData, error: fileError } = await supabase
							.from("task_files")
							.select("file_name, file_path")
							.eq("task_id", task.id)
							.maybeSingle();

						if (!fileError && fileData) {
							fileInfo = {
								name: fileData.file_name,
								path: fileData.file_path,
							};
						}
					} catch (fileError) {
						console.error("Error fetching file info:", fileError);
					}
				}

				if (task.group_id && tasksByGroup[task.group_id]) {
					tasksByGroup[task.group_id].push({
						id: task.id,
						title: task.title,
						due_date: task.due_date,
						description: task.description,
						has_files: task.has_files,
						file_info: fileInfo,
					});
				}
			});

			// Wait for all file info to be fetched
			await Promise.all(taskPromises);

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
			return `Muddat: ${format(date, "MMMM d, yyyy")}`;
		} catch (e) {
			return "Muddat: -";
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

	// Function to enter edit mode for a task
	const openEditTaskModal = (task: Task, groupId: string) => {
		// Find the group
		const group = groups.find((g) => g.id === groupId);
		if (!group) return;

		setSelectedGroup(group);
		setTaskToEdit(task);
		setTaskTitle(task.title);
		setTaskDescription(task.description || "");
		setTaskDueDate(new Date(task.due_date));
		setSelectedFile(null); // Don't set the old file here, only for display
		setIsEditMode(true);
		setTaskModalVisible(true);
	};

	// Function to close the edit modal and reset state
	const closeEditTaskModal = () => {
		closeTaskModal();
		setTaskToEdit(null);
		setIsEditMode(false);
	};

	// Function to update a task
	const handleUpdateTask = async () => {
		if (!taskToEdit || !selectedGroup) return;

		// Validate input
		if (!taskTitle.trim()) {
			Alert.alert("Xato", "Iltimos vazifa sarlavhasini kiriting");
			return;
		}

		try {
			setTaskLoading(true);

			// Update task in the database
			const updateData: any = {
				title: taskTitle,
				description: taskDescription.trim() || null,
				due_date: taskDueDate.toISOString(),
			};

			// If a new file was selected, mark as having files
			if (selectedFile) {
				updateData.has_files = true;
			}

			const { error: taskError } = await supabase
				.from("tasks")
				.update(updateData)
				.eq("id", taskToEdit.id);

			if (taskError) throw taskError;

			// Handle file upload/replacement if selected
			if (selectedFile) {
				setFileUploading(true);
				try {
					// Upload the new file
					const filePath = await uploadTaskFile(taskToEdit.id, selectedFile);

					// Delete old file record (if exists) and create new one
					if (filePath) {
						// First delete old record
						await supabase
							.from("task_files")
							.delete()
							.eq("task_id", taskToEdit.id);

						// Then create new record
						const { error: fileError } = await supabase
							.from("task_files")
							.insert({
								task_id: taskToEdit.id,
								file_path: filePath,
								file_name: selectedFile.name,
								file_type: selectedFile.type,
								file_size: selectedFile.size,
							});

						if (fileError) {
							console.error("Error updating file record:", fileError);
						}
					}
				} catch (uploadError) {
					console.error("Error uploading new file:", uploadError);
					Alert.alert(
						"Ogohlantirish",
						"Vazifa yangilandi, lekin faylni yuklashda muammo yuzaga keldi."
					);
				} finally {
					setFileUploading(false);
				}
			}

			// Close modal and refresh tasks
			closeEditTaskModal();
			await fetchTasksForGroups([selectedGroup.id]);

			// Show success message
			Alert.alert("Muvaffaqiyat", "Vazifa muvaffaqiyatli yangilandi");
		} catch (error) {
			console.error("Error updating task:", error);
			Alert.alert("Xato", "Vazifani yangilashda xatolik yuz berdi");
		} finally {
			setTaskLoading(false);
		}
	};

	// Function to delete file from a task
	const handleDeleteFile = async () => {
		if (!taskToEdit || !selectedGroup) return;

		Alert.alert(
			"Faylni o'chirish",
			"Haqiqatan ham faylni o'chirishni xohlaysizmi?",
			[
				{
					text: "Bekor qilish",
					style: "cancel",
				},
				{
					text: "O'chirish",
					style: "destructive",
					onPress: async () => {
						try {
							setFileUploading(true);

							// Delete file record
							const { error: deleteError } = await supabase
								.from("task_files")
								.delete()
								.eq("task_id", taskToEdit.id);

							if (deleteError) throw deleteError;

							// Update task to indicate no files
							const { error: updateError } = await supabase
								.from("tasks")
								.update({ has_files: false })
								.eq("id", taskToEdit.id);

							if (updateError) throw updateError;

							// Update local state
							setSelectedFile(null);
							setTaskToEdit({
								...taskToEdit,
								has_files: false,
								file_info: null,
							});

							Alert.alert("Muvaffaqiyat", "Fayl muvaffaqiyatli o'chirildi");
						} catch (error) {
							console.error("Error deleting file:", error);
							Alert.alert("Xato", "Faylni o'chirishda xatolik yuz berdi");
						} finally {
							setFileUploading(false);
						}
					},
				},
			]
		);
	};

	const renderTaskItem = (task: Task, groupId: string) => (
		<View
			key={task.id}
			style={[styles.taskItem, isSmallScreen && styles.smallTaskItem]}>
			<View style={styles.taskItemLeftSection}>
				<View
					style={[
						styles.taskIconContainer,
						isSmallScreen && styles.smallTaskIconContainer,
					]}>
					<Ionicons
						name={task.has_files ? "document-text" : "document-text-outline"}
						size={isSmallScreen ? 16 : 20}
						color='#4285F4'
					/>
				</View>
				<View style={styles.taskDetails}>
					<Text
						style={[styles.taskTitle, isSmallScreen && styles.smallTaskTitle]}
						numberOfLines={1}>
						{task.title}
					</Text>
					<View style={styles.taskDateContainer}>
						<Ionicons
							name='calendar-outline'
							size={isSmallScreen ? 12 : 14}
							color='#777'
						/>
						<Text
							style={[styles.taskDate, isSmallScreen && styles.smallTaskDate]}>
							{formatTaskDate(task.due_date).replace("Muddat: ", "")}
						</Text>
					</View>
				</View>
			</View>

			<TouchableOpacity
				style={[styles.editButton, isSmallScreen && styles.smallEditButton]}
				onPress={() => openEditTaskModal(task, groupId)}>
				<Ionicons
					name='pencil'
					size={isSmallScreen ? 14 : 16}
					color='#4285F4'
				/>
			</TouchableOpacity>
		</View>
	);

	const renderGroupItem = ({ item }: { item: Group }) => {
		const groupTasks = tasks[item.id] || [];
		const displayTasks = item.expanded ? groupTasks.slice(0, 3) : [];
		const hasMoreTasks = groupTasks.length > 3;

		return (
			<View style={styles.groupSection}>
				<TouchableOpacity
					style={[styles.groupCard, isSmallScreen && styles.smallGroupCard]}
					onPress={() => openTaskModal(item)}>
					<View
						style={[
							styles.userIconContainer,
							isSmallScreen && styles.smallUserIconContainer,
						]}>
						<Ionicons
							name='person-outline'
							size={isSmallScreen ? 20 : 24}
							color='#4285F4'
						/>
					</View>
					<View style={styles.groupInfo}>
						<Text
							style={[
								styles.groupName,
								isSmallScreen && styles.smallGroupName,
							]}>
							{item.name}
						</Text>
						{item.description ? (
							<Text
								style={[
									styles.groupDescription,
									isSmallScreen && styles.smallGroupDescription,
								]}
								numberOfLines={2}>
								{item.description}
							</Text>
						) : null}
						<Text
							style={[
								styles.groupDate,
								isSmallScreen && styles.smallGroupDate,
							]}>
							{formatDate(item.created_at)}
						</Text>
						<TouchableOpacity
							style={[
								styles.idContainer,
								isSmallScreen && styles.smallIdContainer,
							]}
							onPress={(e) => {
								e.stopPropagation();
								copyToClipboard(item.id);
							}}>
							<Text
								style={[styles.groupId, isSmallScreen && styles.smallGroupId]}>
								ID: {shortenId(item.id)}
							</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>

				{/* Tasks section for this specific group */}
				<View style={styles.tasksSectionContainer}>
					<TouchableOpacity
						style={[
							styles.tasksHeaderRow,
							isSmallScreen && styles.smallTasksHeaderRow,
							item.expanded && {
								borderBottomWidth: 1,
								borderBottomColor: "#f0f0f0",
							},
						]}
						onPress={() => toggleGroupExpanded(item.id)}>
						<Text
							style={[
								styles.tasksSectionTitle,
								isSmallScreen && styles.smallTasksSectionTitle,
							]}>
							Vazifalar ({groupTasks.length})
						</Text>
						<Ionicons
							name={item.expanded ? "chevron-down" : "chevron-forward"}
							size={isSmallScreen ? 16 : 18}
							color='#000'
						/>
					</TouchableOpacity>

					{item.expanded && (
						<View
							style={[
								styles.tasksExpandedContent,
								isSmallScreen && styles.smallTasksExpandedContent,
							]}>
							{displayTasks.length > 0 ? (
								<>
									{displayTasks.map((task) => renderTaskItem(task, item.id))}

									{hasMoreTasks && (
										<TouchableOpacity
											style={[
												styles.seeAllButton,
												isSmallScreen && styles.smallSeeAllButton,
											]}
											onPress={() =>
												navigateToViewAllTasks(item.id, item.name)
											}>
											<Text
												style={[
													styles.seeAllText,
													isSmallScreen && styles.smallSeeAllText,
												]}>
												Hammasini ko'rish
											</Text>
										</TouchableOpacity>
									)}
								</>
							) : (
								<View style={styles.emptyTasksContainer}>
									<Text
										style={[
											styles.emptyTasksText,
											isSmallScreen && styles.smallEmptyTasksText,
										]}>
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
			<Ionicons
				name='people-outline'
				size={isSmallScreen ? 50 : 60}
				color='#ccc'
			/>
			<Text style={[styles.emptyText, isSmallScreen && { fontSize: 16 }]}>
				Guruhlar topilmadi
			</Text>
			<Text style={[styles.emptySubtext, isSmallScreen && { fontSize: 13 }]}>
				Birinchi guruh yaratish uchun bosing
			</Text>
			<TouchableOpacity
				style={[
					styles.createButton,
					isSmallScreen && {
						paddingVertical: 10,
						paddingHorizontal: 20,
					},
				]}
				onPress={openCreateModal}>
				<Text
					style={[styles.createButtonText, isSmallScreen && { fontSize: 14 }]}>
					Guruh yaratish
				</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text
						style={[
							styles.headerTitle,
							isSmallScreen && styles.smallHeaderTitle,
						]}>
						Mening guruhlarim
					</Text>
					<TouchableOpacity
						onPress={openCreateModal}
						style={[
							styles.headerButton,
							isSmallScreen && styles.smallHeaderButton,
						]}>
						<Ionicons name='add' size={isSmallScreen ? 20 : 24} color='white' />
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
						contentContainerStyle={[
							styles.listContent,
							isSmallScreen && styles.smallListContent,
						]}
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

				{/* Task Creation/Edit Modal */}
				<Modal
					animationType='slide'
					transparent={true}
					visible={taskModalVisible}
					onRequestClose={isEditMode ? closeEditTaskModal : closeTaskModal}>
					<TouchableWithoutFeedback
						onPress={isEditMode ? closeEditTaskModal : closeTaskModal}>
						<View style={styles.modalOverlay}>
							<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
								<View style={styles.modalContent}>
									<Text style={styles.modalTitle}>
										{isEditMode
											? "Vazifani tahrirlash"
											: "Yangi vazifa yaratish"}
									</Text>

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

										{/* Show current file if in edit mode and has files */}
										{isEditMode &&
										taskToEdit?.has_files &&
										taskToEdit?.file_info &&
										!selectedFile ? (
											<View style={styles.fileInfoContainer}>
												<View style={styles.fileInfo}>
													<Ionicons
														name='document-text'
														size={20}
														color='#4285F4'
													/>
													<Text style={styles.fileName} numberOfLines={1}>
														{taskToEdit.file_info.name}
													</Text>
												</View>
												<TouchableOpacity
													style={styles.deleteFileButton}
													onPress={handleDeleteFile}>
													<Ionicons
														name='trash-outline'
														size={20}
														color='#FF3B30'
													/>
												</TouchableOpacity>
											</View>
										) : (
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
												{selectedFile && (
													<TouchableOpacity
														style={styles.deleteSelectedFileButton}
														onPress={() => setSelectedFile(null)}>
														<Ionicons
															name='close-circle'
															size={20}
															color='#FF3B30'
														/>
													</TouchableOpacity>
												)}
											</TouchableOpacity>
										)}
									</View>

									<View style={styles.modalButtons}>
										<TouchableOpacity
											style={styles.cancelButton}
											onPress={
												isEditMode ? closeEditTaskModal : closeTaskModal
											}>
											<Text style={styles.cancelButtonText}>Bekor qilish</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={styles.createModalButton}
											onPress={isEditMode ? handleUpdateTask : handleCreateTask}
											disabled={taskLoading || fileUploading}>
											{taskLoading || fileUploading ? (
												<ActivityIndicator size='small' color='#fff' />
											) : (
												<Text style={styles.createModalButtonText}>
													{isEditMode ? "Saqlash" : "Vazifa yaratish"}
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
	},
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
	},
	header: {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		backgroundColor: "#4169E1",
		paddingTop: 50,
		paddingBottom: 20,
		paddingHorizontal: 20,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: "white",
	},
	smallHeaderTitle: {
		fontSize: 20,
	},
	headerButton: {
		width: 30,
		height: 30,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "white",
	},
	smallHeaderButton: {
		width: 26,
		height: 26,
		borderRadius: 13,
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
	smallListContent: {
		padding: 12,
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
	smallGroupCard: {
		padding: 12,
		borderRadius: 10,
		marginBottom: 6,
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
	smallUserIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 10,
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
	smallGroupName: {
		fontSize: 16,
		marginBottom: 2,
	},
	groupDate: {
		fontSize: 14,
		color: "#777",
		marginBottom: 8,
	},
	smallGroupDate: {
		fontSize: 12,
		marginBottom: 6,
	},
	idContainer: {
		backgroundColor: "#E8F0FE",
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 4,
		alignSelf: "flex-start",
	},
	smallIdContainer: {
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 3,
	},
	groupId: {
		fontSize: 12,
		color: "#4285F4",
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
	smallGroupId: {
		fontSize: 10,
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
	smallTasksHeaderRow: {
		padding: 12,
	},
	tasksSectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	smallTasksSectionTitle: {
		fontSize: 14,
	},
	tasksExpandedContent: {
		padding: 8,
	},
	smallTasksExpandedContent: {
		padding: 6,
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
	smallTaskItem: {
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 6,
		marginBottom: 6,
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
	smallTaskIconContainer: {
		width: 30,
		height: 30,
		borderRadius: 15,
		marginRight: 8,
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
	smallTaskTitle: {
		fontSize: 14,
		marginBottom: 2,
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
	smallTaskDate: {
		fontSize: 12,
		marginLeft: 3,
	},
	editButton: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: "#E8F0FE",
		justifyContent: "center",
		alignItems: "center",
	},
	smallEditButton: {
		width: 26,
		height: 26,
		borderRadius: 13,
	},

	// File display styles
	fileInfoContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		backgroundColor: "#f9f9f9",
	},
	fileInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	fileName: {
		fontSize: 16,
		color: "#333",
		marginLeft: 8,
		flex: 1,
	},
	deleteFileButton: {
		padding: 4,
	},
	deleteSelectedFileButton: {
		marginLeft: "auto",
		padding: 2,
	},
	seeAllButton: {
		padding: 12,
		alignItems: "center",
	},
	smallSeeAllButton: {
		padding: 10,
	},
	seeAllText: {
		color: "#4285F4",
		fontWeight: "500",
	},
	smallSeeAllText: {
		fontSize: 13,
	},
	emptyTasksContainer: {
		padding: 16,
		alignItems: "center",
	},
	emptyTasksText: {
		color: "#777",
		fontSize: 14,
	},
	smallEmptyTasksText: {
		fontSize: 12,
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

	// Other existing styles
	// ... (unchanged)

	groupDescription: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	smallGroupDescription: {
		fontSize: 12,
		marginBottom: 2,
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
});
