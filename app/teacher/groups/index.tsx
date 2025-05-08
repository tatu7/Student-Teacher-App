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
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Group = {
	id: string;
	name: string;
	created_at: string;
	student_count: number;
};

export default function GroupsScreen() {
	const { user } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);

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
				created_at: group.created_at,
				student_count: group.group_students[0]?.count || 0,
			}));

			setGroups(processedGroups);
		} catch (error) {
			console.error("Error fetching groups:", error);
			Alert.alert("Error", "Failed to load groups");
		} finally {
			setLoading(false);
		}
	};

	const navigateToGroupDetails = (groupId: string, groupName: string) => {
		router.push({
			pathname: "/teacher/groups/[id]",
			params: { id: groupId, name: groupName },
		});
	};

	const navigateToCreateGroup = () => {
		router.push("/teacher/groups/create");
	};

	const renderGroupItem = ({ item }: { item: Group }) => (
		<TouchableOpacity
			style={styles.groupCard}
			onPress={() => navigateToGroupDetails(item.id, item.name)}>
			<View style={styles.groupCardContent}>
				<View style={styles.groupIcon}>
					<Ionicons name='people' size={24} color='#3f51b5' />
				</View>
				<View style={styles.groupDetails}>
					<Text style={styles.groupName}>{item.name}</Text>
					<Text style={styles.groupMeta}>
						{item.student_count} student{item.student_count !== 1 ? "s" : ""}
					</Text>
				</View>
				<MaterialIcons name='chevron-right' size={24} color='#999' />
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='people-outline' size={60} color='#ccc' />
			<Text style={styles.emptyText}>No groups found</Text>
			<Text style={styles.emptySubtext}>
				Create your first group to add students and assign tasks
			</Text>
			<TouchableOpacity
				style={styles.createButton}
				onPress={navigateToCreateGroup}>
				<Text style={styles.createButtonText}>Create Group</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Groups",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerRight: () => (
						<TouchableOpacity
							onPress={navigateToCreateGroup}
							style={styles.headerButton}>
							<Ionicons name='add' size={24} color='#3f51b5' />
						</TouchableOpacity>
					),
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
	groupCard: {
		backgroundColor: "white",
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	groupCardContent: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
	},
	groupIcon: {
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
	groupMeta: {
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
	createButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	createButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
