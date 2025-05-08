import React, { useState, useEffect, useMemo } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	SafeAreaView,
	FlatList,
	Modal,
	TextInput,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
	format,
	parseISO,
	isToday,
	isThisWeek,
	addDays,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameDay,
} from "date-fns";

// Types
type Group = {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
};

type Student = {
	id: string;
	name: string | null;
	email: string;
};

type Task = {
	id: string;
	title: string;
	description: string | null;
	due_date: string;
	created_at: string;
	group_id: string;
	group_name?: string;
	status?: string;
	submissions_count?: number;
};

export default function CalendarScreen() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
	const [filterModalVisible, setFilterModalVisible] = useState(false);
	const [searchText, setSearchText] = useState("");

	// Calculate calendar days for current month
	const calendarDays = useMemo(() => {
		const start = startOfMonth(selectedMonth);
		const end = endOfMonth(selectedMonth);
		return eachDayOfInterval({ start, end });
	}, [selectedMonth]);

	// Fetch data on component mount
	useEffect(() => {
		fetchData();
	}, []);

	// Fetch filtered tasks when filters change
	useEffect(() => {
		fetchTasks();
	}, [selectedGroup, selectedStudent]);

	const fetchData = async () => {
		try {
			setLoading(true);
			await Promise.all([fetchTasks(), fetchGroups(), fetchStudents()]);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchTasks = async () => {
		try {
			let query = supabase.from("tasks").select(
				`
          id, 
          title, 
          description, 
          due_date, 
          created_at,
          group_id,
          groups(name)
        `
			);

			// Apply filters if set
			if (selectedGroup) {
				query = query.eq("group_id", selectedGroup);
			}

			const { data, error } = await query;

			if (error) throw error;

			if (data) {
				// Process the data to include the group name
				const processedTasks = data.map((task) => ({
					...task,
					group_name: task.groups?.name,
				}));

				// Filter by student if needed
				let filteredTasks = processedTasks;
				if (selectedStudent) {
					// Fetch submissions for the selected student
					const { data: submissionData, error: submissionError } =
						await supabase
							.from("task_submissions")
							.select("task_id")
							.eq("student_id", selectedStudent);

					if (submissionError) throw submissionError;

					// Get task IDs that the student is assigned to
					const studentTaskIds =
						submissionData?.map((sub) => sub.task_id) || [];
					filteredTasks = processedTasks.filter((task) =>
						studentTaskIds.includes(task.id)
					);
				}

				setTasks(filteredTasks);
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
		}
	};

	const fetchGroups = async () => {
		try {
			const { data, error } = await supabase.from("groups").select("*");

			if (error) throw error;

			if (data) {
				setGroups(data);
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
		}
	};

	const fetchStudents = async () => {
		try {
			// First get all students in groups
			const { data: groupStudentsData, error: groupStudentsError } =
				await supabase.from("group_students").select("student_id, group_id");

			if (groupStudentsError) throw groupStudentsError;

			if (groupStudentsData && groupStudentsData.length > 0) {
				// Filter out any null or invalid IDs
				const studentIds = groupStudentsData
					.map((item) => item.student_id)
					.filter((id) => id && typeof id === "string");

				if (studentIds.length === 0) {
					setStudents([]);
					return;
				}

				// Then fetch student details
				const { data: studentsData, error: studentsError } = await supabase
					.from("user_profiles")
					.select("id, name, email")
					.in("id", studentIds);

				if (studentsError) throw studentsError;

				if (studentsData) {
					setStudents(studentsData);
				}
			} else {
				setStudents([]);
			}
		} catch (error) {
			console.error("Error fetching students:", error);
		}
	};

	const getTasksForSelectedDate = () => {
		return tasks.filter((task) => {
			const taskDate = parseISO(task.due_date);
			return isSameDay(taskDate, selectedDate);
		});
	};

	const handleDayPress = (day: Date) => {
		setSelectedDate(day);
	};

	const handleCreateTask = () => {
		// Navigate to task creation with the selected date prefilled
		router.push({
			pathname: "/teacher/tasks/create",
			params: {
				prefillDate: selectedDate.toISOString(),
				groupId: selectedGroup || undefined,
			},
		});
	};

	const handlePreviousMonth = () => {
		const newDate = new Date(selectedMonth);
		newDate.setMonth(newDate.getMonth() - 1);
		setSelectedMonth(newDate);
	};

	const handleNextMonth = () => {
		const newDate = new Date(selectedMonth);
		newDate.setMonth(newDate.getMonth() + 1);
		setSelectedMonth(newDate);
	};

	const resetFilters = () => {
		setSelectedGroup(null);
		setSelectedStudent(null);
		setSearchText("");
	};

	// Render calendar day cell
	const renderDay = (day: Date) => {
		const isSelected = isSameDay(day, selectedDate);
		const dayTasks = tasks.filter((task) => {
			const taskDate = parseISO(task.due_date);
			return isSameDay(taskDate, day);
		});

		const hasTask = dayTasks.length > 0;

		return (
			<TouchableOpacity
				key={day.toString()}
				style={[
					styles.dayCell,
					isToday(day) && styles.todayCell,
					isSelected && styles.selectedDayCell,
					hasTask && styles.hasTaskCell,
				]}
				onPress={() => handleDayPress(day)}>
				<Text
					style={[
						styles.dayText,
						isSelected && styles.selectedDayText,
						isToday(day) && styles.todayText,
					]}>
					{format(day, "d")}
				</Text>
				{hasTask && (
					<View style={styles.taskDot}>
						<Text style={styles.taskCount}>{dayTasks.length}</Text>
					</View>
				)}
			</TouchableOpacity>
		);
	};

	// Render a task item
	const renderTaskItem = ({ item }: { item: Task }) => (
		<TouchableOpacity
			style={styles.taskItem}
			onPress={() => router.push(`/teacher/tasks/${item.id}`)}>
			<View style={styles.taskHeader}>
				<Text style={styles.taskTitle}>{item.title}</Text>
				<Text style={styles.taskDueTime}>
					{format(parseISO(item.due_date), "h:mm a")}
				</Text>
			</View>

			<Text style={styles.taskGroup}>
				Group: {item.group_name || "Unknown"}
			</Text>

			{item.description && (
				<Text style={styles.taskDescription} numberOfLines={2}>
					{item.description}
				</Text>
			)}
		</TouchableOpacity>
	);

	// Render filter modal
	const renderFilterModal = () => (
		<Modal
			visible={filterModalVisible}
			transparent={true}
			animationType='slide'
			onRequestClose={() => setFilterModalVisible(false)}>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Filter Tasks</Text>
						<TouchableOpacity
							onPress={() => setFilterModalVisible(false)}
							style={styles.closeButton}>
							<Ionicons name='close' size={24} color='#666' />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.modalBody}>
						<Text style={styles.filterSectionTitle}>By Group</Text>
						<TouchableOpacity
							style={[
								styles.filterOption,
								selectedGroup === null && styles.selectedFilterOption,
							]}
							onPress={() => setSelectedGroup(null)}>
							<Text style={styles.filterOptionText}>All Groups</Text>
							{selectedGroup === null && (
								<Ionicons name='checkmark' size={22} color='#3f51b5' />
							)}
						</TouchableOpacity>

						{groups.map((group) => (
							<TouchableOpacity
								key={group.id}
								style={[
									styles.filterOption,
									selectedGroup === group.id && styles.selectedFilterOption,
								]}
								onPress={() => setSelectedGroup(group.id)}>
								<Text style={styles.filterOptionText}>{group.name}</Text>
								{selectedGroup === group.id && (
									<Ionicons name='checkmark' size={22} color='#3f51b5' />
								)}
							</TouchableOpacity>
						))}

						<View style={styles.divider} />

						<Text style={styles.filterSectionTitle}>By Student</Text>
						<TouchableOpacity
							style={[
								styles.filterOption,
								selectedStudent === null && styles.selectedFilterOption,
							]}
							onPress={() => setSelectedStudent(null)}>
							<Text style={styles.filterOptionText}>All Students</Text>
							{selectedStudent === null && (
								<Ionicons name='checkmark' size={22} color='#3f51b5' />
							)}
						</TouchableOpacity>

						{students.map((student) => (
							<TouchableOpacity
								key={student.id}
								style={[
									styles.filterOption,
									selectedStudent === student.id && styles.selectedFilterOption,
								]}
								onPress={() => setSelectedStudent(student.id)}>
								<Text style={styles.filterOptionText}>
									{student.name || student.email}
								</Text>
								{selectedStudent === student.id && (
									<Ionicons name='checkmark' size={22} color='#3f51b5' />
								)}
							</TouchableOpacity>
						))}
					</ScrollView>

					<View style={styles.modalFooter}>
						<TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
							<Text style={styles.resetButtonText}>Reset Filters</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.applyButton}
							onPress={() => setFilterModalVisible(false)}>
							<Text style={styles.applyButtonText}>Apply</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: "Calendar" }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			</SafeAreaView>
		);
	}

	const tasksForSelectedDate = getTasksForSelectedDate();

	// Render weekday headers
	const renderWeekdayHeaders = () => {
		const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return (
			<View style={styles.weekdayHeader}>
				{weekdays.map((day) => (
					<Text key={day} style={styles.weekdayText}>
						{day}
					</Text>
				))}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Calendar",
					headerTitleAlign: "center",
					headerRight: () => (
						<TouchableOpacity
							onPress={() => setFilterModalVisible(true)}
							style={{ marginRight: 15 }}>
							<Ionicons name='filter' size={24} color='#3f51b5' />
						</TouchableOpacity>
					),
				}}
			/>

			<View style={styles.calendarContainer}>
				{/* Month navigation */}
				<View style={styles.monthNavigator}>
					<TouchableOpacity onPress={handlePreviousMonth}>
						<Ionicons name='chevron-back' size={24} color='#3f51b5' />
					</TouchableOpacity>

					<Text style={styles.monthTitle}>
						{format(selectedMonth, "MMMM yyyy")}
					</Text>

					<TouchableOpacity onPress={handleNextMonth}>
						<Ionicons name='chevron-forward' size={24} color='#3f51b5' />
					</TouchableOpacity>
				</View>

				{/* Weekday headers */}
				{renderWeekdayHeaders()}

				{/* Calendar grid */}
				<View style={styles.calendarGrid}>
					{calendarDays.map((day) => renderDay(day))}
				</View>
			</View>

			{/* Filter chips */}
			{(selectedGroup || selectedStudent) && (
				<View style={styles.filtersApplied}>
					{selectedGroup && groups.find((g) => g.id === selectedGroup) && (
						<View style={styles.filterChip}>
							<Text style={styles.filterChipText}>
								Group: {groups.find((g) => g.id === selectedGroup)?.name}
							</Text>
							<TouchableOpacity onPress={() => setSelectedGroup(null)}>
								<Ionicons name='close-circle' size={18} color='#666' />
							</TouchableOpacity>
						</View>
					)}

					{selectedStudent &&
						students.find((s) => s.id === selectedStudent) && (
							<View style={styles.filterChip}>
								<Text style={styles.filterChipText}>
									Student:{" "}
									{students.find((s) => s.id === selectedStudent)?.name ||
										"Unknown"}
								</Text>
								<TouchableOpacity onPress={() => setSelectedStudent(null)}>
									<Ionicons name='close-circle' size={18} color='#666' />
								</TouchableOpacity>
							</View>
						)}
				</View>
			)}

			{/* Tasks for selected date */}
			<View style={styles.selectedDateContainer}>
				<Text style={styles.selectedDateTitle}>
					Tasks for {format(selectedDate, "EEEE, MMMM d, yyyy")}
				</Text>

				{tasksForSelectedDate.length > 0 ? (
					<FlatList
						data={tasksForSelectedDate}
						renderItem={renderTaskItem}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.tasksList}
					/>
				) : (
					<View style={styles.noTasksContainer}>
						<Text style={styles.noTasksText}>No tasks on this date</Text>
					</View>
				)}
			</View>

			{/* Create task button */}
			<TouchableOpacity
				style={styles.createTaskButton}
				onPress={handleCreateTask}>
				<Ionicons name='add' size={24} color='white' />
				<Text style={styles.createTaskButtonText}>Create Task</Text>
			</TouchableOpacity>

			{renderFilterModal()}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	calendarContainer: {
		backgroundColor: "white",
		borderRadius: 12,
		margin: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	monthNavigator: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	monthTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	weekdayHeader: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 8,
	},
	weekdayText: {
		width: 36,
		textAlign: "center",
		fontWeight: "500",
		color: "#666",
		fontSize: 12,
	},
	calendarGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-start",
	},
	dayCell: {
		width: "14.28%",
		height: 40,
		justifyContent: "center",
		alignItems: "center",
		marginVertical: 2,
		position: "relative",
	},
	dayText: {
		fontSize: 14,
		color: "#333",
	},
	todayCell: {
		backgroundColor: "#f0f0f0",
		borderRadius: 20,
	},
	todayText: {
		fontWeight: "bold",
	},
	selectedDayCell: {
		backgroundColor: "#3f51b5",
		borderRadius: 20,
	},
	selectedDayText: {
		color: "white",
		fontWeight: "bold",
	},
	hasTaskCell: {
		position: "relative",
	},
	taskDot: {
		position: "absolute",
		bottom: 2,
		backgroundColor: "#ff9800",
		width: 16,
		height: 16,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	taskCount: {
		color: "white",
		fontSize: 10,
		fontWeight: "bold",
	},
	selectedDateContainer: {
		flex: 1,
		marginHorizontal: 16,
	},
	selectedDateTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 12,
		color: "#333",
	},
	tasksList: {
		paddingBottom: 80,
	},
	taskItem: {
		backgroundColor: "white",
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	taskHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		flex: 1,
	},
	taskDueTime: {
		fontSize: 14,
		color: "#ff9800",
		fontWeight: "500",
	},
	taskGroup: {
		fontSize: 14,
		color: "#3f51b5",
		marginBottom: 6,
	},
	taskDescription: {
		fontSize: 14,
		color: "#666",
	},
	noTasksContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 30,
	},
	noTasksText: {
		fontSize: 16,
		color: "#666",
	},
	createTaskButton: {
		position: "absolute",
		bottom: 20,
		right: 20,
		backgroundColor: "#3f51b5",
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 30,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	createTaskButtonText: {
		color: "white",
		fontWeight: "600",
		marginLeft: 8,
	},
	filtersApplied: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	filterChip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 20,
		paddingVertical: 6,
		paddingHorizontal: 12,
		marginRight: 8,
		marginBottom: 8,
	},
	filterChipText: {
		fontSize: 14,
		marginRight: 6,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 20,
		maxHeight: "80%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
		paddingHorizontal: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
	},
	closeButton: {
		padding: 5,
	},
	modalBody: {
		paddingHorizontal: 20,
		maxHeight: 400,
	},
	filterSectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: 10,
		marginBottom: 12,
	},
	filterOption: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	selectedFilterOption: {
		backgroundColor: "#f0f4ff",
	},
	filterOptionText: {
		fontSize: 16,
	},
	divider: {
		height: 1,
		backgroundColor: "#e0e0e0",
		marginVertical: 15,
	},
	modalFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	resetButton: {
		padding: 12,
	},
	resetButtonText: {
		color: "#666",
		fontSize: 16,
	},
	applyButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	applyButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
