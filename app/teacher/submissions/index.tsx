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
	StatusBar,
	Modal,
	TextInput,
	useWindowDimensions,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Submission = {
	id: string;
	task_title: string;
	task_id: string;
	student_name: string;
	student_id: string;
	content: string;
	submitted_at: string;
	rating: number | null;
	feedback: string | null;
	group_name: string;
	group_id: string;
};

export default function SubmissionsScreen() {
	const { user } = useAuth();
	const { width } = useWindowDimensions();
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [loading, setLoading] = useState(true);

	// Rating modal state
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedSubmission, setSelectedSubmission] =
		useState<Submission | null>(null);
	const [currentRating, setCurrentRating] = useState<number | null>(null);
	const [feedback, setFeedback] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchSubmissions();
	}, []);

	const fetchSubmissions = async () => {
		try {
			setLoading(true);

			if (!user) return;

			// Fetch teacher's groups first
			const { data: groupsData, error: groupsError } = await supabase
				.from("groups")
				.select("id, name")
				.eq("teacher_id", user.id);

			if (groupsError) throw groupsError;

			if (!groupsData || groupsData.length === 0) {
				setSubmissions([]);
				setLoading(false);
				return;
			}

			const groupIds = groupsData.map((group) => group.id);

			// Now fetch tasks for these groups
			const { data: tasksData, error: tasksError } = await supabase
				.from("tasks")
				.select("id, title, group_id")
				.in("group_id", groupIds);

			if (tasksError) throw tasksError;

			if (!tasksData || tasksData.length === 0) {
				setSubmissions([]);
				setLoading(false);
				return;
			}

			// Finally fetch submissions for these tasks
			const taskIds = tasksData.map((task) => task.id);

			const { data: submissionsData, error: submissionsError } = await supabase
				.from("submissions")
				.select(
					`
					id,
					task_id,
					student_id,
					content,
					rating,
					feedback,
					submitted_at
				`
				)
				.in("task_id", taskIds)
				.order("submitted_at", { ascending: false });

			if (submissionsError) throw submissionsError;

			// Fetch student profiles
			const studentIds = [
				...new Set(submissionsData.map((sub) => sub.student_id)),
			];

			const { data: profilesData, error: profilesError } = await supabase
				.from("user_profiles")
				.select("id, name, display_name")
				.in("id", studentIds);

			if (profilesError) {
				console.error("Error fetching student profiles:", profilesError);
			}

			// Map and combine the data
			const formattedSubmissions = submissionsData.map((submission) => {
				const task = tasksData.find((t) => t.id === submission.task_id);
				const group = groupsData.find((g) => g.id === task?.group_id);
				const profile = profilesData?.find(
					(p) => p.id === submission.student_id
				);

				const studentName = profile
					? profile.display_name || profile.name || "O'quvchi"
					: "O'quvchi";

				return {
					id: submission.id,
					task_id: submission.task_id,
					task_title: task?.title || "Topshiriq",
					student_id: submission.student_id,
					student_name: studentName,
					content: submission.content || "",
					submitted_at: submission.submitted_at,
					rating: submission.rating,
					feedback: submission.feedback,
					group_name: group?.name || "Guruh",
					group_id: group?.id || "",
				};
			});

			setSubmissions(formattedSubmissions);
		} catch (error) {
			console.error("Error fetching submissions:", error);
			Alert.alert("Xatolik", "Javoblarni yuklashda muammo yuzaga keldi");
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

	const openRatingModal = (submission: Submission) => {
		setSelectedSubmission(submission);
		setCurrentRating(submission.rating || null);
		setFeedback(submission.feedback || "");
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setSelectedSubmission(null);
		setCurrentRating(null);
		setFeedback("");
	};

	const handleRating = async () => {
		if (!selectedSubmission) return;

		try {
			setSaving(true);

			const { error } = await supabase
				.from("submissions")
				.update({
					rating: currentRating,
					feedback: feedback.trim(),
				})
				.eq("id", selectedSubmission.id);

			if (error) throw error;

			// Update local state
			setSubmissions((prevSubmissions) =>
				prevSubmissions.map((sub) =>
					sub.id === selectedSubmission.id
						? { ...sub, rating: currentRating, feedback: feedback.trim() }
						: sub
				)
			);

			closeModal();
			Alert.alert("Muvaffaqiyatli", "Baho va fikr muvaffaqiyatli saqlandi");
		} catch (error) {
			console.error("Error saving rating:", error);
			Alert.alert("Xatolik", "Baho va fikrni saqlashda muammo yuzaga keldi");
		} finally {
			setSaving(false);
		}
	};

	const handleStarPress = (rating: number) => {
		setCurrentRating(rating);
	};

	const renderStars = () => {
		const starSize = width < 350 ? 30 : 36;
		const stars = [];
		for (let i = 1; i <= 5; i++) {
			stars.push(
				<TouchableOpacity
					key={i}
					style={styles.starContainer}
					onPress={() => handleStarPress(i)}>
					<Ionicons
						name={i <= (currentRating || 0) ? "star" : "star-outline"}
						size={starSize}
						color='#FFD700'
					/>
				</TouchableOpacity>
			);
		}
		return stars;
	};

	const renderSubmissionItem = ({ item }: { item: Submission }) => (
		<TouchableOpacity
			style={styles.submissionCard}
			onPress={() => openRatingModal(item)}>
			<View style={styles.cardHeader}>
				<Text style={styles.taskTitle} numberOfLines={2}>
					{item.task_title}
				</Text>
				<Text style={styles.groupName} numberOfLines={1}>
					{item.group_name}
				</Text>
			</View>

			<View style={styles.userInfo}>
				<Text style={styles.studentName} numberOfLines={1}>
					{item.student_name}
				</Text>
				<Text style={styles.submittedDate}>
					{new Date(item.submitted_at).toLocaleDateString()}
				</Text>
			</View>

			<View style={styles.contentPreview}>
				<Text numberOfLines={2} style={styles.previewText}>
					{item.content}
				</Text>
			</View>

			<View style={styles.rating}>
				{item.rating !== null ? (
					<View style={styles.stars}>
						<Ionicons name='star' size={16} color='#FFD700' />
						<Text style={styles.ratingText}>{item.rating}/5</Text>
					</View>
				) : (
					<Text style={styles.noRating}>Baholanmagan</Text>
				)}
			</View>
		</TouchableOpacity>
	);

	const renderEmptyList = () => (
		<View style={styles.emptyContainer}>
			<MaterialIcons name='assignment-turned-in' size={60} color='#ccc' />
			<Text style={styles.emptyText}>Javoblar topilmadi</Text>
			<Text style={styles.emptySubtext}>
				Hali o'quvchilar topshiriqlarni yubormagan
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>

			<View style={styles.header}>
				<Text style={styles.headerTitle}>Javoblar</Text>
			</View>

			{loading ? (
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
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

			{/* Rating Modal */}
			<Modal
				animationType='fade'
				transparent={true}
				visible={modalVisible}
				onRequestClose={closeModal}>
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.modalContainer,
							width < 350 && styles.smallModalContainer,
						]}>
						<Text style={styles.modalTitle}>Javobni baholash</Text>

						<View style={styles.starsContainer}>{renderStars()}</View>

						<TextInput
							style={styles.feedbackInput}
							placeholder='Izoh yozing...'
							value={feedback}
							onChangeText={setFeedback}
							multiline
							numberOfLines={4}
						/>

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={closeModal}>
								<Text style={styles.cancelButtonText}>Bekor qilish</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleRating}
								disabled={saving}>
								{saving ? (
									<ActivityIndicator size='small' color='#fff' />
								) : (
									<Text style={styles.submitButtonText}>Baholash</Text>
								)}
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
		backgroundColor: "#F5F7FA",
	},
	header: {
		backgroundColor: "#4169E1",
		paddingTop: StatusBar.currentHeight || 35,
		paddingBottom: 15,
		paddingHorizontal: 16,
	},
	headerTitle: {
		color: "white",
		fontSize: 22,
		fontWeight: "bold",
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
	submissionCard: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 14,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 6,
		flexWrap: "wrap",
	},
	taskTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		flex: 1,
		marginRight: 8,
	},
	groupName: {
		fontSize: 13,
		color: "#666",
		fontWeight: "500",
		maxWidth: "40%",
		textAlign: "right",
	},
	userInfo: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
		flexWrap: "wrap",
	},
	studentName: {
		fontSize: 15,
		color: "#4169E1",
		fontWeight: "500",
		marginRight: 8,
	},
	submittedDate: {
		fontSize: 13,
		color: "#777",
	},
	contentPreview: {
		marginBottom: 10,
		borderLeftWidth: 3,
		borderLeftColor: "#e0e0e0",
		paddingLeft: 8,
	},
	previewText: {
		fontSize: 14,
		color: "#555",
		lineHeight: 20,
	},
	rating: {
		alignItems: "flex-end",
	},
	stars: {
		flexDirection: "row",
		alignItems: "center",
	},
	ratingText: {
		marginLeft: 4,
		fontSize: 13,
		fontWeight: "bold",
		color: "#333",
	},
	noRating: {
		fontSize: 13,
		color: "#888",
		fontStyle: "italic",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	emptyText: {
		fontSize: 17,
		fontWeight: "bold",
		color: "#555",
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 13,
		color: "#888",
		marginTop: 8,
		textAlign: "center",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContainer: {
		width: "90%",
		backgroundColor: "white",
		borderRadius: 16,
		padding: 16,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	smallModalContainer: {
		width: "95%",
		padding: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	starsContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 16,
		flexWrap: "wrap",
	},
	starContainer: {
		padding: 4,
	},
	feedbackInput: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 10,
		minHeight: 90,
		textAlignVertical: "top",
		marginBottom: 16,
	},
	buttonContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
	},
	cancelButton: {
		backgroundColor: "#f1f1f1",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		flex: 1,
		marginRight: 6,
		alignItems: "center",
	},
	cancelButtonText: {
		color: "#666",
		fontWeight: "600",
		fontSize: 14,
	},
	submitButton: {
		backgroundColor: "#4169E1",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		flex: 1,
		marginLeft: 6,
		alignItems: "center",
	},
	submitButtonText: {
		color: "white",
		fontWeight: "600",
		fontSize: 14,
	},
});
