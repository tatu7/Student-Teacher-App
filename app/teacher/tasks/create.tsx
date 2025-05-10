import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	Modal,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { notifyTaskAssigned } from "../../../lib/notifications";

// Types
type Group = {
	id: string;
	name: string;
};

export default function CreateTaskScreen() {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const preselectedGroupId = params.groupId as string;
	const preselectedGroupName = params.groupName as string;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState(
		new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
	); // Default to 1 week from now
	const [showDatePicker, setShowDatePicker] = useState(false);

	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(
		preselectedGroupId && preselectedGroupName
			? { id: preselectedGroupId, name: preselectedGroupName }
			: null
	);
	const [showGroupSelector, setShowGroupSelector] = useState(false);

	const [loading, setLoading] = useState(false);
	const [fetchingGroups, setFetchingGroups] = useState(!preselectedGroupId);

	useEffect(() => {
		if (!preselectedGroupId) {
			fetchGroups();
		}
	}, []);

	const fetchGroups = async () => {
		try {
			setFetchingGroups(true);

			if (!user) return;

			const { data, error } = await supabase
				.from("groups")
				.select("id, name")
				.eq("teacher_id", user.id)
				.order("name");

			if (error) throw error;

			setGroups(data || []);
		} catch (error) {
			console.error("Error fetching groups:", error);
			Alert.alert("Error", "Failed to load groups");
		} finally {
			setFetchingGroups(false);
		}
	};

	const handleCreateTask = async () => {
		// Validate input
		if (!title.trim()) {
			Alert.alert("Error", "Please enter a task title");
			return;
		}

		if (!selectedGroup) {
			Alert.alert("Error", "Please select a group");
			return;
		}

		try {
			setLoading(true);

			const session = supabase.auth.session();

			// Create the task
			const { data, error } = await supabase
				.from("tasks")
				.insert({
					title: title.trim(),
					description: description.trim(),
					due_date: dueDate.toISOString(),
					group_id: selectedGroup.id,
				})
				.select();

			if (error) throw error;

			// **Guruhdagi studentlarni olish**
			const { data: groupStudents, error: groupStudentsError } = await supabase
				.from("group_students")
				.select("student_id")
				.eq("group_id", selectedGroup.id);

			if (groupStudentsError) throw groupStudentsError;

			// **Notification yuborish**
			await Promise.all(
				groupStudents.map((student) =>
					notifyTaskAssigned(student.student_id, title.trim(), data[0].id)
				)
			);

			Alert.alert("Success", "Task created successfully", [
				{
					text: "OK",
					onPress: () => {
						// Navigate back to the group details if we came from there
						if (preselectedGroupId) {
							router.back();
						} else {
							// Otherwise, navigate to the tasks list
							router.push("/teacher/tasks");
						}
					},
				},
			]);
		} catch (error) {
			console.error("Error creating task:", error);
			Alert.alert("Error", "Failed to create task");
		} finally {
			setLoading(false);
		}
	};

	const onChangeDueDate = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false);
		if (selectedDate) {
			setDueDate(selectedDate);
		}
	};

	const renderGroupItem = ({ item }: { item: Group }) => (
		<TouchableOpacity
			style={styles.groupItem}
			onPress={() => {
				setSelectedGroup(item);
				setShowGroupSelector(false);
			}}>
			<Text style={styles.groupItemText}>{item.name}</Text>
			{selectedGroup?.id === item.id && (
				<Ionicons name='checkmark' size={24} color='#3f51b5' />
			)}
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Create Task",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidView}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps='handled'>
					<View style={styles.formContainer}>
						{/* Group Selector */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Group</Text>
							{preselectedGroupId ? (
								<View style={styles.selectedGroupContainer}>
									<Text style={styles.selectedGroupText}>
										{preselectedGroupName}
									</Text>
								</View>
							) : fetchingGroups ? (
								<ActivityIndicator size='small' color='#3f51b5' />
							) : (
								<TouchableOpacity
									style={styles.groupSelector}
									onPress={() => setShowGroupSelector(true)}>
									<Text
										style={
											selectedGroup
												? styles.selectedGroupText
												: styles.placeholderText
										}>
										{selectedGroup ? selectedGroup.name : "Select a group"}
									</Text>
									<MaterialIcons
										name='arrow-drop-down'
										size={24}
										color='#666'
									/>
								</TouchableOpacity>
							)}
						</View>

						{/* Task Title */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Task Title</Text>
							<TextInput
								style={styles.input}
								placeholder='Enter task title'
								value={title}
								onChangeText={setTitle}
							/>
						</View>

						{/* Task Description */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Description</Text>
							<TextInput
								style={[styles.input, styles.multilineInput]}
								placeholder='Enter task description'
								value={description}
								onChangeText={setDescription}
								multiline
								numberOfLines={4}
							/>
						</View>

						{/* Due Date */}
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Due Date</Text>
							<TouchableOpacity
								style={styles.dateSelector}
								onPress={() => setShowDatePicker(true)}>
								<Ionicons name='calendar-outline' size={20} color='#3f51b5' />
								<Text style={styles.dateText}>
									{dueDate.toLocaleDateString()}
								</Text>
							</TouchableOpacity>

							{showDatePicker && (
								<DateTimePicker
									value={dueDate}
									mode='date'
									display='default'
									onChange={onChangeDueDate}
									minimumDate={new Date()}
								/>
							)}
						</View>

						{/* Create Button */}
						<TouchableOpacity
							style={styles.createButton}
							onPress={handleCreateTask}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.createButtonText}>Create Task</Text>
							)}
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* Group Selector Modal */}
			<Modal
				animationType='slide'
				transparent={true}
				visible={showGroupSelector}
				onRequestClose={() => setShowGroupSelector(false)}>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select Group</Text>
							<TouchableOpacity onPress={() => setShowGroupSelector(false)}>
								<Ionicons name='close' size={24} color='#333' />
							</TouchableOpacity>
						</View>

						{groups.length === 0 ? (
							<View style={styles.emptyGroups}>
								<Text style={styles.emptyGroupsText}>
									No groups found. Please create a group first.
								</Text>
								<TouchableOpacity
									style={styles.createGroupButton}
									onPress={() => {
										setShowGroupSelector(false);
										router.push("/teacher/groups/create");
									}}>
									<Text style={styles.createGroupButtonText}>Create Group</Text>
								</TouchableOpacity>
							</View>
						) : (
							<ScrollView style={styles.groupList}>
								{groups.map((group) => (
									<TouchableOpacity
										key={group.id}
										style={styles.groupItem}
										onPress={() => {
											setSelectedGroup(group);
											setShowGroupSelector(false);
										}}>
										<Text style={styles.groupItemText}>{group.name}</Text>
										{selectedGroup?.id === group.id && (
											<Ionicons name='checkmark' size={24} color='#3f51b5' />
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						)}
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	keyboardAvoidView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
	},
	formContainer: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	inputGroup: {
		marginBottom: 20,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		color: "#333",
	},
	input: {
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
		fontSize: 16,
	},
	multilineInput: {
		minHeight: 100,
		textAlignVertical: "top",
	},
	groupSelector: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
	},
	selectedGroupContainer: {
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
	},
	selectedGroupText: {
		fontSize: 16,
		color: "#333",
	},
	placeholderText: {
		fontSize: 16,
		color: "#999",
	},
	dateSelector: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
	},
	dateText: {
		fontSize: 16,
		color: "#333",
		marginLeft: 8,
	},
	createButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		shadowColor: "#3f51b5",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	createButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	modalContainer: {
		flex: 1,
		justifyContent: "center",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	modalContent: {
		backgroundColor: "white",
		margin: 20,
		borderRadius: 12,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
		maxHeight: "80%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
	},
	groupList: {
		marginBottom: 16,
	},
	groupItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	groupItemText: {
		fontSize: 16,
		color: "#333",
	},
	emptyGroups: {
		alignItems: "center",
		padding: 20,
	},
	emptyGroupsText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 16,
	},
	createGroupButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	createGroupButtonText: {
		color: "white",
		fontWeight: "bold",
	},
});
