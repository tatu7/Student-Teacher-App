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
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
	format,
	parseISO,
	isToday,
	isTomorrow,
	isAfter,
	isBefore,
	addDays,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameDay,
	isWithinInterval,
	differenceInCalendarDays,
} from "date-fns";

// Types
type Task = {
	id: string;
	title: string;
	description: string | null;
	due_date: string;
	created_at: string;
	group_id: string;
	group_name: string;
	status: "completed" | "pending" | "overdue" | "locked";
	submission_id?: string | null;
};

type Group = {
	id: string;
	name: string;
};

export default function StudentCalendarScreen() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

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

	const fetchData = async () => {
		try {
			setLoading(true);
			if (!user) return;

			// Fetch groups that the student is a member of
			const { data: studentGroups, error: groupsError } = await supabase
				.from("group_students")
				.select(
					`
          group_id,
          groups:group_id(id, name)
        `
				)
				.eq("student_id", user.id)
				.eq("status", "active");

			if (groupsError) throw groupsError;

			if (studentGroups && studentGroups.length > 0) {
				// Process groups
				const processedGroups = studentGroups.map((group) => ({
					id: group.groups.id,
					name: group.groups.name,
				}));
				setGroups(processedGroups);

				// Get group IDs for task query
				const groupIds = studentGroups.map((g) => g.groups.id);

				// Fetch tasks for these groups
				const { data: taskData, error: tasksError } = await supabase
					.from("tasks")
					.select(
						`
            id,
            title,
            description,
            due_date,
            created_at,
            group_id,
            groups(name)
          `
					)
					.in("group_id", groupIds)
					.order("due_date", { ascending: true });

				if (tasksError) throw tasksError;

				if (taskData) {
					// Fetch student's submissions to determine task status
					const { data: submissionsData, error: submissionsError } =
						await supabase
							.from("submissions")
							.select("id, task_id, submitted_at, rating")
							.eq("student_id", user.id);

					if (submissionsError) throw submissionsError;

					// Process tasks with status
					const now = new Date();
					const processedTasks = taskData.map((task) => {
						const dueDate = parseISO(task.due_date);
						const submission = submissionsData?.find(
							(s) => s.task_id === task.id
						);

						let status: "completed" | "pending" | "overdue" | "locked" =
							"pending";

						// A task is completed if there's a submission
						if (submission) {
							status = "completed";
						}
						// A task is overdue if due date has passed and no submission
						else if (isBefore(dueDate, now)) {
							status = "overdue";
						}
						// A task is pending if due date is in the future
						else {
							status = "pending";
						}

						return {
							...task,
							group_name: task.groups?.name || "Unknown",
							status,
							submission_id: submission?.id || null,
						};
					});

					setTasks(processedTasks);
				}
			} else {
				setGroups([]);
				setTasks([]);
			}
		} catch (error) {
			console.error("Error fetching calendar data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getTasksForSelectedDate = () => {
		return tasks.filter((task) => {
			const taskDate = parseISO(task.due_date);
			return isSameDay(taskDate, selectedDate);
		});
	};

	const getDaysUntilDue = (dueDate: string) => {
		const today = new Date();
		const due = parseISO(dueDate);
		return differenceInCalendarDays(due, today);
	};

	const getDeadlineText = (dueDate: string, status: string) => {
		if (status === "completed") return "Completed";
		if (status === "overdue") return "Overdue";

		const daysUntil = getDaysUntilDue(dueDate);
		if (daysUntil === 0) return "Due today";
		if (daysUntil === 1) return "Due tomorrow";
		return `Due in ${daysUntil} days`;
	};

	const getStatusColor = (status: string, dueDate: string) => {
		if (status === "completed") return "#4CAF50"; // Green
		if (status === "overdue") return "#F44336"; // Red

		const daysUntil = getDaysUntilDue(dueDate);
		if (daysUntil <= 1) return "#FF9800"; // Orange for urgent
		if (daysUntil <= 3) return "#FFC107"; // Amber for soon
		return "#2196F3"; // Blue for normal
	};

	const handleDayPress = (day: Date) => {
		setSelectedDate(day);
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

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: "Calendar" }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			</SafeAreaView>
		);
	}

	const tasksForSelectedDate = getTasksForSelectedDate();

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Kalendar</Text>
			</View>

			<View style={styles.calendarContainer}>
				{/* Month navigation */}
				<View style={styles.monthNavigator}>
					<TouchableOpacity onPress={handlePreviousMonth}>
						<Ionicons name='chevron-back' size={24} color='#4169E1' />
					</TouchableOpacity>

					<Text style={styles.monthTitle}>
						{format(selectedMonth, "MMMM yyyy")}
					</Text>

					<TouchableOpacity onPress={handleNextMonth}>
						<Ionicons name='chevron-forward' size={24} color='#4169E1' />
					</TouchableOpacity>
				</View>

				{/* Weekday headers */}
				<View style={styles.weekdayHeader}>
					<Text style={styles.weekdayText}>Sun</Text>
					<Text style={styles.weekdayText}>Mon</Text>
					<Text style={styles.weekdayText}>Tue</Text>
					<Text style={styles.weekdayText}>Wed</Text>
					<Text style={styles.weekdayText}>Thu</Text>
					<Text style={styles.weekdayText}>Fri</Text>
					<Text style={styles.weekdayText}>Sat</Text>
				</View>

				{/* Calendar grid */}
				<View style={styles.calendarGrid}>
					{calendarDays.map((day) => renderDay(day))}
				</View>
			</View>

			{/* Tasks for selected date */}
			<View style={styles.selectedDateContainer}>
				<Text style={styles.selectedDateTitle}>
					{format(selectedDate, "EEEE, d-MMMM, yyyy")} uchun vazifalar
				</Text>

				{tasksForSelectedDate.length > 0 ? (
					<FlatList
						data={tasksForSelectedDate}
						renderItem={({ item }) => (
							<View style={styles.taskItem}>
								<View style={styles.taskIcon}>
									<Ionicons
										name='document-text-outline'
										size={24}
										color='#4169E1'
									/>
								</View>
								<View style={styles.taskContent}>
									<Text style={styles.taskTitle}>{item.title}</Text>
									<Text style={styles.taskGroup}>
										{item.group_name || "Guruh nomi"}
									</Text>
									{item.description && (
										<Text style={styles.taskDescription} numberOfLines={1}>
											{item.description}
										</Text>
									)}
								</View>
							</View>
						)}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.tasksList}
					/>
				) : (
					<View style={styles.noTasksContainer}>
						<Text style={styles.noTasksText}>Bu kunda vazifalar yo'q</Text>
					</View>
				)}
			</View>
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
		justifyContent: "space-around",
	},
	dayCell: {
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
		marginVertical: 4,
		borderRadius: 20,
	},
	dayText: {
		fontSize: 14,
		color: "#333",
	},
	todayCell: {
		backgroundColor: "#EFF3FF",
	},
	todayText: {
		fontWeight: "bold",
		color: "#4169E1",
	},
	selectedDayCell: {
		backgroundColor: "#4169E1",
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
		top: -4,
		right: -4,
		backgroundColor: "#4169E1",
		width: 16,
		height: 16,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "white",
	},
	taskCount: {
		color: "white",
		fontSize: 9,
		fontWeight: "bold",
	},
	selectedDateContainer: {
		flex: 1,
		marginHorizontal: 16,
	},
	selectedDateTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 16,
		color: "#333",
	},
	tasksList: {
		paddingBottom: 20,
	},
	taskItem: {
		flexDirection: "row",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	taskIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#EFF3FF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	taskContent: {
		flex: 1,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	taskGroup: {
		fontSize: 14,
		color: "#4169E1",
		marginBottom: 4,
	},
	taskDescription: {
		fontSize: 14,
		color: "#666",
	},
	noTasksContainer: {
		alignItems: "center",
		paddingVertical: 30,
		backgroundColor: "white",
		borderRadius: 12,
	},
	noTasksText: {
		fontSize: 16,
		color: "#666",
	},
	legend: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 10,
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	legendDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 6,
	},
	legendText: {
		fontSize: 12,
		color: "#666",
	},
});
