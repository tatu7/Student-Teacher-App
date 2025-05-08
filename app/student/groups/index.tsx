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
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Group = {
	id: string;
	name: string;
	teacher_name: string;
	pending_tasks: number;
	completed_tasks: number;
};

interface Submission {
	id: string;
	student_id: string;
}

export default function StudentGroupsScreen() {
	const { user } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchGroups();
	}, []);

	const fetchGroups = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Fetch groups that the student is a member of
			const { data: studentGroups, error: groupsError } = await supabase
				.from("group_students")
				.select(
					`
          id,
          status,
          groups:group_id(
            id, 
            name,
            teacher_id
          )
        `
				)
				.eq("student_id", user.id)
				.eq("status", "active");

			if (groupsError) throw groupsError;

			if (studentGroups && studentGroups.length > 0) {
				// Get group IDs for further queries
				const groupIds = studentGroups.map((g) => g.groups.id);

				// Get teacher info separately
				const teacherIds = studentGroups.map((g) => g.groups.teacher_id);
				const { data: teachersData, error: teachersError } = await supabase
					.from("user_profiles")
					.select("id, email")
					.in("id", teacherIds);

				if (teachersError) throw teachersError;

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
					.order("due_date", { ascending: false });

				if (tasksError) throw tasksError;

				// Process groups with task counts
				const processedGroups = studentGroups.map((group) => {
					const groupTasks =
						tasks?.filter((t) => t.group_id === group.groups.id) || [];
					const completedTasks = groupTasks.filter(
						(t) =>
							t.submissions &&
							t.submissions.some((s: Submission) => s.student_id === user.id)
					).length;

					// Find teacher for this group
					const teacher = teachersData?.find(
						(t) => t.id === group.groups.teacher_id
					);
					const teacherName = teacher ? teacher.email.split("@")[0] : "Teacher";

					return {
						id: group.groups.id,
						name: group.groups.name,
						teacher_name: teacherName,
						pending_tasks: groupTasks.length - completedTasks,
						completed_tasks: completedTasks,
					};
				});

				setGroups(processedGroups);
			} else {
				setGroups([]);
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
			Alert.alert("Error", "Failed to load groups");
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroupDetails = (groupId: string, groupName: string) => {
		router.push({
			pathname: "/student/groups/" as any,
			params: { id: groupId, name: groupName },
		});
	};

	const renderGroupItem = ({ item }: { item: Group }) => (
		<TouchableOpacity
			style={styles.groupCard}
			onPress={() => navigateToGroupDetails(item.id, item.name)}>
			<View style={styles.groupIconContainer}>
				<Ionicons name='people' size={24} color='#3f51b5' />
			</View>
			<View style={styles.groupDetails}>
				<Text style={styles.groupName}>{item.name}</Text>
				<Text style={styles.teacherName}>Teacher: {item.teacher_name}</Text>
				<View style={styles.taskStats}>
					<Text style={styles.pendingTasks}>{item.pending_tasks} pending</Text>
					<Text style={styles.completedTasks}>
						{item.completed_tasks} completed
					</Text>
				</View>
			</View>
			<MaterialIcons name='chevron-right' size={24} color='#999' />
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='people-outline' size={60} color='#ccc' />
			<Text style={styles.emptyText}>No groups joined</Text>
			<Text style={styles.emptySubtext}>
				You haven't been added to any groups yet
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "My Groups",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
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
	listContent: {
		padding: 16,
		flexGrow: 1,
	},
	groupCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	groupIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#e8eaf6",
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
	teacherName: {
		fontSize: 14,
		color: "#666",
		marginBottom: 8,
	},
	taskStats: {
		flexDirection: "row",
	},
	pendingTasks: {
		fontSize: 14,
		color: "#ff9800",
		marginRight: 12,
	},
	completedTasks: {
		fontSize: 14,
		color: "#4caf50",
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
});
