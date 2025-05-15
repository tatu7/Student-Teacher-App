import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	SafeAreaView,
	Alert,
	Image,
	Dimensions,
	useWindowDimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type GradedTask = {
	id: string;
	title: string;
	description: string;
	due_date: string;
	group_id: string;
	group_name: string;
	submission_id: string;
	submitted_at: string;
	feedback?: string;
	rating?: number;
};

export default function StudentGradesScreen() {
	const { user } = useAuth();
	const [gradedTasks, setGradedTasks] = useState<GradedTask[]>([]);
	const [loading, setLoading] = useState(true);
	const { width } = useWindowDimensions();

	// Determine if small screen
	const isSmallScreen = width < 375;

	useEffect(() => {
		fetchGradedTasks();
	}, []);

	const fetchGradedTasks = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Fetch submissions by this student that have a rating
			const { data: submissionsData, error: submissionsError } = await supabase
				.from("submissions")
				.select(
					`
          id,
          task_id,
          content,
          submitted_at,
          updated_at,
          feedback,
          rating,
          tasks:task_id(
            id,
            title,
            description,
            due_date,
            group_id
          )
        `
				)
				.eq("student_id", user.id)
				.not("rating", "is", null)
				.order("updated_at", { ascending: false });

			if (submissionsError) throw submissionsError;

			if (!submissionsData || submissionsData.length === 0) {
				setGradedTasks([]);
				setLoading(false);
				return;
			}

			// Get group IDs from tasks to fetch group names
			const groupIds = [
				...new Set(submissionsData.map((s) => s.tasks.group_id)),
			];

			// Fetch group names
			const { data: groupsData, error: groupsError } = await supabase
				.from("groups")
				.select("id, name")
				.in("id", groupIds);

			if (groupsError) throw groupsError;

			// Format data for UI
			const processed = submissionsData.map((submission) => {
				const group = groupsData?.find(
					(g) => g.id === submission.tasks.group_id
				);
				return {
					id: submission.tasks.id,
					title: submission.tasks.title,
					description: submission.tasks.description || "",
					due_date: submission.tasks.due_date,
					group_id: submission.tasks.group_id,
					group_name: group?.name || "Unknown Group",
					submission_id: submission.id,
					submitted_at: submission.submitted_at,
					feedback: submission.feedback,
					rating: submission.rating,
				};
			});

			setGradedTasks(processed);
		} catch (error) {
			console.error("Error fetching graded tasks:", error);
			Alert.alert(
				"Xatolik",
				"Baholangan vazifalarni yuklashda xatolik yuz berdi"
			);
		} finally {
			setLoading(false);
		}
	};

	const navigateToTaskDetails = (
		taskId: string,
		taskTitle: string,
		groupId: string,
		groupName: string
	) => {
		router.push({
			pathname: "/student/groups/task/[id]",
			params: { id: taskId, name: taskTitle, groupId, groupName },
		});
	};

	const renderStars = (rating?: number) => {
		if (!rating) return null;

		// Calculate stars (out of 5) based on rating out of 100
		const stars = Math.round((rating / 100) * 5);
		const starSize = isSmallScreen ? 14 : 18;

		return (
			<View style={styles.starsContainer}>
				{[1, 2, 3, 4, 5].map((i) => (
					<FontAwesome
						key={i}
						name={i <= stars ? "star" : "star-o"}
						size={starSize}
						color={i <= stars ? "#FFD700" : "#D3D3D3"}
						style={styles.starIcon}
					/>
				))}
				<Text style={[styles.ratingText, isSmallScreen && styles.smallText]}>
					{stars}/5
				</Text>
			</View>
		);
	};

	const renderGradedTaskItem = ({ item }: { item: GradedTask }) => (
		<TouchableOpacity
			style={styles.taskCard}
			onPress={() =>
				navigateToTaskDetails(
					item.id,
					item.title,
					item.group_id,
					item.group_name
				)
			}>
			<View style={styles.taskHeader}>
				<Text
					style={[styles.taskTitle, isSmallScreen && styles.smallTitleText]}>
					{item.title}
				</Text>
				<Text style={[styles.taskDate, isSmallScreen && styles.smallText]}>
					{new Date(item.due_date).toLocaleDateString("uz-UZ")}
				</Text>
			</View>

			{renderStars(item.rating)}

			{item.feedback && (
				<View style={styles.feedbackContainer}>
					<Text
						style={[styles.feedbackLabel, isSmallScreen && styles.smallText]}>
						O'qituvchi izohi:
					</Text>
					<Text
						style={[styles.feedbackText, isSmallScreen && styles.smallText]}>
						{item.feedback}
					</Text>
				</View>
			)}

			<View style={styles.taskFooter}>
				<Text style={[styles.groupName, isSmallScreen && styles.smallText]}>
					{item.group_name}
				</Text>
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons
				name='star-border'
				size={isSmallScreen ? 50 : 70}
				color='#D0D7F0'
			/>
			<Text style={[styles.emptyText, isSmallScreen && styles.smallEmptyText]}>
				Baholangan vazifalar topilmadi
			</Text>
			<Text style={[styles.emptySubtext, isSmallScreen && styles.smallText]}>
				Hozircha hech qanday vazifa baholanmagan
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text
					style={[
						styles.headerTitle,
						isSmallScreen && styles.smallHeaderTitle,
					]}>
					Baholar
				</Text>
			</View>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			) : (
				<FlatList
					data={gradedTasks}
					renderItem={renderGradedTaskItem}
					keyExtractor={(item) => item.submission_id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyList}
					refreshing={loading}
					onRefresh={fetchGradedTasks}
				/>
			)}
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
		paddingHorizontal: 20,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	smallHeaderTitle: {
		fontSize: 20,
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	listContent: {
		padding: 12,
		flexGrow: 1,
	},
	taskCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 14,
		marginBottom: 14,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	taskHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 10,
	},
	taskTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		flex: 1,
		marginRight: 8,
	},
	smallTitleText: {
		fontSize: 16,
	},
	taskDate: {
		fontSize: 14,
		color: "#666",
	},
	starsContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
		flexWrap: "wrap",
	},
	starIcon: {
		marginRight: 2,
	},
	ratingText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		marginLeft: 8,
	},
	feedbackContainer: {
		backgroundColor: "#f5f5f5",
		borderRadius: 8,
		padding: 10,
		marginBottom: 10,
	},
	feedbackLabel: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 4,
	},
	feedbackText: {
		fontSize: 14,
		color: "#555",
		lineHeight: 20,
	},
	taskFooter: {
		flexDirection: "row",
		justifyContent: "flex-start",
		alignItems: "center",
	},
	groupName: {
		fontSize: 14,
		color: "#4169E1",
		fontWeight: "500",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		marginTop: 60,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginTop: 16,
	},
	smallEmptyText: {
		fontSize: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginTop: 8,
	},
	smallText: {
		fontSize: 12,
	},
});
