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
			if (!user) return;

			// Get groups where student is a member using student_id
			const { data, error } = await supabase
				.from("group_students")
				.select(
					`
					group_id,
					groups:group_id(id, name, teacher_id, created_at)
				`
				)
				.eq("student_id", user.id); // Use user.id from Auth

			if (error) throw error;

			// Transform data structure
			const groups = data.map((item) => item.groups);
			setGroups(groups);
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
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Guruhlar</Text>
			</View>

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
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333",
	},
});
