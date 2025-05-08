import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Alert,
	ActivityIndicator,
	TextInput,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	Modal,
	ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Student = {
	id: string;
	email: string;
	status: "pending" | "active" | "declined";
};

type Task = {
	id: string;
	title: string;
	due_date: string;
	submission_count: number;
};

export default function GroupDetailsScreen() {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const groupId = params.id as string;
	const groupName = params.name as string;

	const [students, setStudents] = useState<Student[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const [addModalVisible, setAddModalVisible] = useState(false);
	const [newStudentEmail, setNewStudentEmail] = useState("");
	const [addingStudent, setAddingStudent] = useState(false);

	useEffect(() => {
		fetchGroupData();
	}, [groupId]);

	const fetchGroupData = async () => {
		try {
			setLoading(true);

			// Fetch students in the group
			const { data: studentData, error: studentError } = await supabase
				.from("group_students")
				.select("id, student_email, status")
				.eq("group_id", groupId);

			if (studentError) throw studentError;

			setStudents(
				studentData.map((s) => ({
					id: s.id,
					email: s.student_email,
					status: s.status,
				}))
			);

			// Fetch tasks for the group
			const { data: taskData, error: taskError } = await supabase
				.from("tasks")
				.select(
					`
          id, 
          title, 
          due_date,
          submissions:submissions(count)
        `
				)
				.eq("group_id", groupId)
				.order("due_date", { ascending: false });

			if (taskError) throw taskError;

			// Process task data
			const processedTasks = taskData.map((task) => ({
				id: task.id,
				title: task.title,
				due_date: task.due_date,
				submission_count: task.submissions[0]?.count || 0,
			}));

			setTasks(processedTasks);
		} catch (error) {
			console.error("Error fetching group data:", error);
			Alert.alert("Error", "Failed to load group data");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const handleRefresh = () => {
		setRefreshing(true);
		fetchGroupData();
	};

	const handleAddStudent = async () => {
		if (!newStudentEmail.trim()) {
			Alert.alert("Error", "Please enter a valid email");
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newStudentEmail)) {
			Alert.alert("Error", "Please enter a valid email address");
			return;
		}

		setAddingStudent(true);

		try {
			// Check if student already in group
			const existingStudent = students.find(
				(s) => s.email.toLowerCase() === newStudentEmail.toLowerCase()
			);

			if (existingStudent) {
				Alert.alert("Error", "This student is already in the group");
				return;
			}

			// Add student to group_students table
			const { data, error } = await supabase
				.from("group_students")
				.insert({
					group_id: groupId,
					student_email: newStudentEmail.trim(),
					status: "pending",
				})
				.select();

			if (error) throw error;

			// Add to local state
			setStudents([
				...students,
				{
					id: data[0].id,
					email: newStudentEmail.trim(),
					status: "pending",
				},
			]);

			setNewStudentEmail("");
			setAddModalVisible(false);
		} catch (error) {
			console.error("Error adding student:", error);
			Alert.alert("Error", "Failed to add student");
		} finally {
			setAddingStudent(false);
		}
	};

	const handleRemoveStudent = async (studentId: string) => {
		Alert.alert(
			"Remove Student",
			"Are you sure you want to remove this student from the group?",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Remove",
					style: "destructive",
					onPress: async () => {
						try {
							const { error } = await supabase
								.from("group_students")
								.delete()
								.eq("id", studentId);

							if (error) throw error;

							// Update local state
							setStudents(students.filter((s) => s.id !== studentId));
						} catch (error) {
							console.error("Error removing student:", error);
							Alert.alert("Error", "Failed to remove student");
						}
					},
				},
			]
		);
	};

	const navigateToCreateTask = () => {
		router.push({
			pathname: "/teacher/tasks/create",
			params: { groupId, groupName },
		});
	};

	const navigateToTaskDetails = (taskId: string, taskName: string) => {
		router.push({
			pathname: "/teacher/tasks/[id]",
			params: { id: taskId, name: taskName, groupId, groupName },
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "#4caf50";
			case "pending":
				return "#ff9800";
			case "declined":
				return "#f44336";
			default:
				return "#999";
		}
	};

	const renderStudentItem = ({ item }: { item: Student }) => (
		<View style={styles.studentCard}>
			<View style={styles.studentInfo}>
				<Ionicons name='person' size={20} color='#3f51b5' />
				<Text style={styles.studentEmail}>{item.email}</Text>
			</View>
			<View style={styles.studentActions}>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: getStatusColor(item.status) + "20" },
					]}>
					<Text
						style={[styles.statusText, { color: getStatusColor(item.status) }]}>
						{item.status.charAt(0).toUpperCase() + item.status.slice(1)}
					</Text>
				</View>
				<TouchableOpacity
					style={styles.removeButton}
					onPress={() => handleRemoveStudent(item.id)}>
					<Ionicons name='close-circle' size={24} color='#f44336' />
				</TouchableOpacity>
			</View>
		</View>
	);

	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskCard}
			onPress={() => navigateToTaskDetails(item.id, item.title)}>
			<View style={styles.taskInfo}>
				<MaterialIcons name='assignment' size={20} color='#3f51b5' />
				<View style={styles.taskDetails}>
					<Text style={styles.taskTitle}>{item.title}</Text>
					<Text style={styles.taskDate}>
						Due: {new Date(item.due_date).toLocaleDateString()}
					</Text>
				</View>
			</View>
			<View style={styles.taskMeta}>
				<Text style={styles.submissionCount}>
					{item.submission_count} submission
					{item.submission_count !== 1 ? "s" : ""}
				</Text>
				<MaterialIcons name='chevron-right' size={24} color='#999' />
			</View>
		</TouchableOpacity>
	);

	const renderEmptyStudentList = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='people-outline' size={48} color='#ccc' />
			<Text style={styles.emptyText}>No students in this group</Text>
			<TouchableOpacity
				style={styles.addButton}
				onPress={() => setAddModalVisible(true)}>
				<Text style={styles.addButtonText}>Add Students</Text>
			</TouchableOpacity>
		</View>
	);

	const renderEmptyTaskList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons name='assignment' size={48} color='#ccc' />
			<Text style={styles.emptyText}>No tasks assigned</Text>
			<TouchableOpacity style={styles.addButton} onPress={navigateToCreateTask}>
				<Text style={styles.addButtonText}>Create Task</Text>
			</TouchableOpacity>
		</View>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: groupName }} />
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: groupName,
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<View style={styles.tabs}>
				<FlatList
					data={students}
					renderItem={renderStudentItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Students</Text>
							<TouchableOpacity
								onPress={() => setAddModalVisible(true)}
								style={styles.headerButton}>
								<Ionicons name='add' size={20} color='#3f51b5' />
								<Text style={styles.headerButtonText}>Add</Text>
							</TouchableOpacity>
						</View>
					}
					ListEmptyComponent={renderEmptyStudentList}
					refreshing={refreshing}
					onRefresh={handleRefresh}
				/>

				<View style={styles.divider} />

				<FlatList
					data={tasks}
					renderItem={renderTaskItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Tasks</Text>
							<TouchableOpacity
								onPress={navigateToCreateTask}
								style={styles.headerButton}>
								<Ionicons name='add' size={20} color='#3f51b5' />
								<Text style={styles.headerButtonText}>Create</Text>
							</TouchableOpacity>
						</View>
					}
					ListEmptyComponent={renderEmptyTaskList}
					refreshing={refreshing}
					onRefresh={handleRefresh}
				/>
			</View>

			{/* Add Student Modal */}
			<Modal
				animationType='slide'
				transparent={true}
				visible={addModalVisible}
				onRequestClose={() => setAddModalVisible(false)}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Student</Text>
							<TouchableOpacity
								onPress={() => setAddModalVisible(false)}
								style={styles.closeButton}>
								<Ionicons name='close' size={24} color='#333' />
							</TouchableOpacity>
						</View>

						<Text style={styles.inputLabel}>Student Email</Text>
						<TextInput
							style={styles.input}
							placeholder='Enter student email'
							value={newStudentEmail}
							onChangeText={setNewStudentEmail}
							autoCapitalize='none'
							keyboardType='email-address'
							autoFocus
						/>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleAddStudent}
							disabled={addingStudent}>
							{addingStudent ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.submitButtonText}>Add Student</Text>
							)}
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	tabs: {
		flex: 1,
	},
	listContent: {
		padding: 16,
		flexGrow: 1,
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
	headerButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#e8eaf6",
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 16,
	},
	headerButtonText: {
		color: "#3f51b5",
		fontWeight: "600",
		marginLeft: 4,
	},
	studentCard: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "white",
		padding: 16,
		borderRadius: 8,
		marginBottom: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	studentInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	studentEmail: {
		marginLeft: 8,
		fontSize: 16,
		color: "#333",
	},
	studentActions: {
		flexDirection: "row",
		alignItems: "center",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
	},
	removeButton: {
		padding: 4,
	},
	taskCard: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "white",
		padding: 16,
		borderRadius: 8,
		marginBottom: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	taskInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	taskDetails: {
		marginLeft: 8,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	taskDate: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	taskMeta: {
		flexDirection: "row",
		alignItems: "center",
	},
	submissionCount: {
		fontSize: 14,
		color: "#666",
		marginRight: 8,
	},
	divider: {
		height: 8,
		backgroundColor: "#f0f0f0",
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
		marginTop: 20,
	},
	emptyText: {
		fontSize: 16,
		color: "#999",
		marginTop: 8,
		marginBottom: 16,
	},
	addButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 20,
	},
	addButtonText: {
		color: "white",
		fontWeight: "600",
	},
	modalContainer: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	modalContent: {
		backgroundColor: "white",
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 5,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
	},
	closeButton: {
		padding: 4,
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
		marginBottom: 20,
	},
	submitButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 20,
	},
	submitButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
