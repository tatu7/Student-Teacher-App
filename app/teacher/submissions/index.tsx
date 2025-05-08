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
	Modal,
	ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Submission = {
	id: string;
	task_title: string;
	task_id: string;
	student_name: string;
	student_email: string;
	group_name: string;
	submitted_at: string;
	rating: number | null;
};

type Filter = {
	groupId: string | null;
	taskId: string | null;
};

type Group = {
	id: string;
	name: string;
};

type Task = {
	id: string;
	title: string;
};

export default function SubmissionsScreen() {
	const { user } = useAuth();
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);
	const [groups, setGroups] = useState<Group[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);

	const [filters, setFilters] = useState<Filter>({
		groupId: null,
		taskId: null,
	});

	const [showFilterModal, setShowFilterModal] = useState(false);

	useEffect(() => {
		fetchSubmissions();
		fetchFilterOptions();
	}, []);

	useEffect(() => {
		// Refetch with filters when they change
		fetchSubmissions();
	}, [filters]);

	const fetchFilterOptions = async () => {
		try {
			if (!user) return;

			// Fetch groups for this teacher
			const { data: groupsData, error: groupsError } = await supabase
				.from("groups")
				.select("id, name")
				.eq("teacher_id", user.id)
				.order("name");

			if (groupsError) throw groupsError;
			setGroups(groupsData || []);

			// Fetch unique tasks
			if (groupsData && groupsData.length > 0) {
				const groupIds = groupsData.map((g) => g.id);

				const { data: tasksData, error: tasksError } = await supabase
					.from("tasks")
					.select("id, title")
					.in("group_id", groupIds)
					.order("title");

				if (tasksError) throw tasksError;
				setTasks(tasksData || []);
			}
		} catch (error) {
			console.error("Error fetching filter options:", error);
		}
	};

	const fetchSubmissions = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Start building the query
			let query = supabase
				.from("submissions")
				.select(
					`
          id,
          submitted_at,
          rating,
          tasks!inner(id, title, group_id),
          student_id
        `
				)
				.order("submitted_at", { ascending: false });

			// Apply filters if set
			if (filters.taskId) {
				query = query.eq("tasks.id", filters.taskId);
			}

			if (filters.groupId) {
				query = query.eq("tasks.group_id", filters.groupId);
			}

			const { data, error } = await query;

			if (error) throw error;

			// To get group names, we need to fetch groups
			const groupIds = [...new Set(data.map((item) => item.tasks.group_id))];

			if (groupIds.length > 0) {
				const { data: groupsData, error: groupsError } = await supabase
					.from("groups")
					.select("id, name")
					.in("id", groupIds);

				if (groupsError) throw groupsError;

				// Fetch user profiles for all student IDs
				const studentIds = [...new Set(data.map((item) => item.student_id))];

				if (studentIds.length > 0) {
					const { data: profilesData, error: profilesError } = await supabase
						.from("auth.users")
						.select("id, email")
						.in("id", studentIds);

					if (profilesError) {
						console.error("Error fetching student profiles:", profilesError);
						throw profilesError;
					}

					// Map the data
					const processedSubmissions = data.map((item) => {
						const group = groupsData.find((g) => g.id === item.tasks.group_id);
						const profile = profilesData?.find((p) => p.id === item.student_id);
						const email = profile?.email || "unknown@email.com";

						return {
							id: item.id,
							task_title: item.tasks.title,
							task_id: item.tasks.id,
							student_name: email.split("@")[0], // Using email username as name
							student_email: email,
							group_name: group ? group.name : "Unknown Group",
							submitted_at: item.submitted_at,
							rating: item.rating,
						};
					});

					setSubmissions(processedSubmissions);
				} else {
					setSubmissions([]);
				}
			} else {
				setSubmissions([]);
			}
		} catch (error) {
			console.error("Error fetching submissions:", error);
			Alert.alert("Error", "Failed to load submissions");
		} finally {
			setLoading(false);
		}
	};

	const navigateToSubmissionDetails = (
		submissionId: string,
		taskTitle: string,
		studentName: string
	) => {
		router.push({
			pathname: "/teacher/submissions/[id]",
			params: { id: submissionId, taskName: taskTitle, studentName },
		});
	};

	const clearFilters = () => {
		setFilters({ groupId: null, taskId: null });
		setShowFilterModal(false);
	};

	const renderSubmissionItem = ({ item }: { item: Submission }) => (
		<TouchableOpacity
			style={styles.submissionCard}
			onPress={() =>
				navigateToSubmissionDetails(item.id, item.task_title, item.student_name)
			}>
			<View style={styles.submissionHeader}>
				<View style={styles.taskInfo}>
					<MaterialIcons name='assignment' size={20} color='#3f51b5' />
					<Text style={styles.taskTitle}>{item.task_title}</Text>
				</View>
				{item.rating !== null && (
					<View style={styles.ratingBadge}>
						<Text style={styles.ratingText}>{item.rating}/10</Text>
					</View>
				)}
			</View>

			<View style={styles.studentInfo}>
				<Ionicons
					name='person'
					size={16}
					color='#666'
					style={styles.infoIcon}
				/>
				<Text style={styles.studentName}>{item.student_name}</Text>
			</View>

			<View style={styles.groupInfo}>
				<Ionicons
					name='people'
					size={16}
					color='#666'
					style={styles.infoIcon}
				/>
				<Text style={styles.groupName}>{item.group_name}</Text>
			</View>

			<View style={styles.dateInfo}>
				<Ionicons
					name='time-outline'
					size={16}
					color='#666'
					style={styles.infoIcon}
				/>
				<Text style={styles.submissionDate}>
					{new Date(item.submitted_at).toLocaleString()}
				</Text>
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons name='assignment-turned-in' size={60} color='#ccc' />
			<Text style={styles.emptyText}>No submissions found</Text>
			<Text style={styles.emptySubtext}>
				{filters.groupId || filters.taskId
					? "Try changing or clearing your filters"
					: "Students haven't submitted any work yet"}
			</Text>
			{(filters.groupId || filters.taskId) && (
				<TouchableOpacity
					style={styles.clearFiltersButton}
					onPress={clearFilters}>
					<Text style={styles.clearFiltersText}>Clear Filters</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Submissions",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerRight: () => (
						<TouchableOpacity
							onPress={() => setShowFilterModal(true)}
							style={styles.headerButton}>
							<Ionicons name='filter' size={24} color='#3f51b5' />
						</TouchableOpacity>
					),
				}}
			/>

			{/* Active filters display */}
			{(filters.groupId || filters.taskId) && (
				<View style={styles.activeFiltersContainer}>
					<Text style={styles.activeFiltersTitle}>Active Filters:</Text>
					<View style={styles.filterChipsContainer}>
						{filters.groupId && (
							<View style={styles.filterChip}>
								<Text style={styles.filterChipText}>
									Group: {groups.find((g) => g.id === filters.groupId)?.name}
								</Text>
								<TouchableOpacity
									onPress={() => setFilters({ ...filters, groupId: null })}>
									<Ionicons name='close-circle' size={18} color='#666' />
								</TouchableOpacity>
							</View>
						)}
						{filters.taskId && (
							<View style={styles.filterChip}>
								<Text style={styles.filterChipText}>
									Task: {tasks.find((t) => t.id === filters.taskId)?.title}
								</Text>
								<TouchableOpacity
									onPress={() => setFilters({ ...filters, taskId: null })}>
									<Ionicons name='close-circle' size={18} color='#666' />
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			)}

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			) : (
				<FlatList
					data={submissions}
					renderItem={renderSubmissionItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyList}
					refreshing={loading}
					onRefresh={fetchSubmissions}
				/>
			)}

			{/* Filter Modal */}
			<Modal
				animationType='slide'
				transparent={true}
				visible={showFilterModal}
				onRequestClose={() => setShowFilterModal(false)}>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Filter Submissions</Text>
							<TouchableOpacity onPress={() => setShowFilterModal(false)}>
								<Ionicons name='close' size={24} color='#333' />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalScrollView}>
							{/* Group Filter */}
							<Text style={styles.filterLabel}>Filter by Group:</Text>
							<View style={styles.filterOptions}>
								{groups.map((group) => (
									<TouchableOpacity
										key={group.id}
										style={[
											styles.filterOption,
											filters.groupId === group.id &&
												styles.selectedFilterOption,
										]}
										onPress={() =>
											setFilters({ ...filters, groupId: group.id })
										}>
										<Text
											style={[
												styles.filterOptionText,
												filters.groupId === group.id &&
													styles.selectedFilterOptionText,
											]}>
											{group.name}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							{/* Task Filter */}
							<Text style={[styles.filterLabel, { marginTop: 16 }]}>
								Filter by Task:
							</Text>
							<View style={styles.filterOptions}>
								{tasks.map((task) => (
									<TouchableOpacity
										key={task.id}
										style={[
											styles.filterOption,
											filters.taskId === task.id && styles.selectedFilterOption,
										]}
										onPress={() => setFilters({ ...filters, taskId: task.id })}>
										<Text
											style={[
												styles.filterOptionText,
												filters.taskId === task.id &&
													styles.selectedFilterOptionText,
											]}>
											{task.title}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={styles.clearButton}
								onPress={clearFilters}>
								<Text style={styles.clearButtonText}>Clear All</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.applyButton}
								onPress={() => setShowFilterModal(false)}>
								<Text style={styles.applyButtonText}>Apply</Text>
							</TouchableOpacity>
						</View>
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
	headerButton: {
		marginRight: 15,
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
	activeFiltersContainer: {
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	activeFiltersTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	filterChipsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	filterChip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#e8eaf6",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginRight: 8,
		marginBottom: 8,
	},
	filterChipText: {
		color: "#3f51b5",
		fontSize: 14,
		marginRight: 6,
	},
	submissionCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	submissionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	taskInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		marginLeft: 8,
		flex: 1,
	},
	ratingBadge: {
		backgroundColor: "#e8eaf6",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	ratingText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#3f51b5",
	},
	studentInfo: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	groupInfo: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	dateInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	infoIcon: {
		marginRight: 6,
	},
	studentName: {
		fontSize: 14,
		color: "#333",
	},
	groupName: {
		fontSize: 14,
		color: "#666",
	},
	submissionDate: {
		fontSize: 14,
		color: "#666",
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
	clearFiltersButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	clearFiltersText: {
		color: "white",
		fontWeight: "bold",
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
	modalScrollView: {
		maxHeight: 400,
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
	filterLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 12,
	},
	filterOptions: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	filterOption: {
		backgroundColor: "#f5f7fa",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		marginRight: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
	},
	selectedFilterOption: {
		backgroundColor: "#e8eaf6",
		borderColor: "#3f51b5",
	},
	filterOptionText: {
		fontSize: 14,
		color: "#666",
	},
	selectedFilterOptionText: {
		color: "#3f51b5",
		fontWeight: "600",
	},
	modalFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	clearButton: {
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	clearButtonText: {
		color: "#666",
		fontWeight: "600",
		fontSize: 16,
	},
	applyButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	applyButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
