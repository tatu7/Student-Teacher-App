import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	TextInput,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

// Types
type Submission = {
	id: string;
	task_id: string;
	student_id: string;
	student_email: string;
	content: string;
	attachment_url: string | null;
	rating: number | null;
	feedback: string | null;
	submitted_at: string;
};

export default function SubmissionDetailScreen() {
	const { user } = useAuth();
	const params = useLocalSearchParams();
	const submissionId = params.id as string;
	const taskName = params.taskName as string;
	const studentName = params.studentName as string;

	const [submission, setSubmission] = useState<Submission | null>(null);
	const [rating, setRating] = useState<number | null>(null);
	const [feedback, setFeedback] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchSubmission();
	}, [submissionId]);

	const fetchSubmission = async () => {
		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("submissions")
				.select(
					`
          id,
          task_id,
          student_id,
          content,
          attachment_url,
          rating,
          feedback,
          submitted_at
        `
				)
				.eq("id", submissionId)
				.single();

			if (error) throw error;

			// Fetch student email from auth.users
			const { data: studentData, error: studentError } = await supabase
				.from("auth.users")
				.select("email")
				.eq("id", data.student_id)
				.single();

			if (studentError) {
				console.error("Error fetching student data:", studentError);
				// Proceed with unknown email
			}

			const studentEmail = studentData?.email || "unknown@email.com";

			const formattedSubmission = {
				id: data.id,
				task_id: data.task_id,
				student_id: data.student_id,
				student_email: studentEmail,
				content: data.content || "",
				attachment_url: data.attachment_url,
				rating: data.rating,
				feedback: data.feedback || "",
				submitted_at: data.submitted_at,
			};

			setSubmission(formattedSubmission);
			setRating(formattedSubmission.rating);
			setFeedback(formattedSubmission.feedback || "");
		} catch (error) {
			console.error("Error fetching submission:", error);
			Alert.alert("Error", "Failed to load submission details");
		} finally {
			setLoading(false);
		}
	};

	const handleSaveRating = async () => {
		try {
			setSaving(true);

			const { error } = await supabase
				.from("submissions")
				.update({
					rating,
					feedback,
				})
				.eq("id", submissionId);

			if (error) throw error;

			Alert.alert("Success", "Rating and feedback saved successfully");
		} catch (error) {
			console.error("Error saving rating:", error);
			Alert.alert("Error", "Failed to save rating and feedback");
		} finally {
			setSaving(false);
		}
	};

	const handleRatingPress = (value: number) => {
		setRating(value);
	};

	const renderRatingStars = () => {
		const stars = [];
		for (let i = 1; i <= 10; i++) {
			stars.push(
				<TouchableOpacity
					key={i}
					style={styles.starContainer}
					onPress={() => handleRatingPress(i)}>
					<Ionicons
						name={i <= (rating || 0) ? "star" : "star-outline"}
						size={32}
						color={i <= (rating || 0) ? "#FFD700" : "#ccc"}
					/>
				</TouchableOpacity>
			);
		}
		return <View style={styles.starsContainer}>{stars}</View>;
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: "Submission Details" }} />
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
					title: "Submission Details",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<ScrollView style={styles.content}>
				{/* Submission Info Card */}
				<View style={styles.card}>
					<View style={styles.submissionHeader}>
						<View style={styles.submissionInfo}>
							<Text style={styles.taskName}>{taskName}</Text>
							<Text style={styles.submissionMeta}>
								By: <Text style={styles.studentNameText}>{studentName}</Text>
							</Text>
							<Text style={styles.submissionMeta}>
								Submitted:{" "}
								{new Date(submission?.submitted_at || "").toLocaleString()}
							</Text>
						</View>
					</View>

					{/* Content */}
					<View style={styles.contentSection}>
						<Text style={styles.sectionLabel}>Content:</Text>
						<Text style={styles.contentText}>
							{submission?.content || "No content provided"}
						</Text>
					</View>

					{/* Attachment (if any) */}
					{submission?.attachment_url && (
						<View style={styles.attachmentSection}>
							<Text style={styles.sectionLabel}>Attachment:</Text>
							<TouchableOpacity style={styles.attachmentButton}>
								<Ionicons name='document-attach' size={20} color='#3f51b5' />
								<Text style={styles.attachmentText}>View Attachment</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Rating Section */}
				<View style={styles.ratingSection}>
					<Text style={styles.ratingTitle}>Rate this submission:</Text>
					{renderRatingStars()}
					<Text style={styles.ratingValue}>
						{rating !== null ? `${rating}/10` : "Not rated yet"}
					</Text>
				</View>

				{/* Feedback Section */}
				<View style={styles.feedbackSection}>
					<Text style={styles.feedbackLabel}>Feedback:</Text>
					<TextInput
						style={styles.feedbackInput}
						placeholder='Provide feedback for the student'
						value={feedback}
						onChangeText={setFeedback}
						multiline
						numberOfLines={4}
					/>
				</View>

				{/* Save Button */}
				<TouchableOpacity
					style={styles.saveButton}
					onPress={handleSaveRating}
					disabled={saving}>
					{saving ? (
						<ActivityIndicator color='#fff' size='small' />
					) : (
						<Text style={styles.saveButtonText}>Save Rating & Feedback</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
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
	content: {
		flex: 1,
		padding: 16,
	},
	card: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	submissionHeader: {
		flexDirection: "row",
		marginBottom: 16,
	},
	submissionInfo: {
		flex: 1,
	},
	taskName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
	},
	submissionMeta: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	studentNameText: {
		fontWeight: "600",
		color: "#333",
	},
	contentSection: {
		marginBottom: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	sectionLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	contentText: {
		fontSize: 16,
		color: "#666",
		lineHeight: 24,
	},
	attachmentSection: {
		marginBottom: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	attachmentButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#e8eaf6",
		padding: 12,
		borderRadius: 8,
	},
	attachmentText: {
		marginLeft: 8,
		color: "#3f51b5",
		fontWeight: "600",
	},
	ratingSection: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	ratingTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	starsContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 8,
	},
	starContainer: {
		padding: 4,
	},
	ratingValue: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#3f51b5",
		marginTop: 8,
	},
	feedbackSection: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	feedbackLabel: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 12,
	},
	feedbackInput: {
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
		fontSize: 16,
		minHeight: 120,
		textAlignVertical: "top",
	},
	saveButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 24,
		shadowColor: "#3f51b5",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	saveButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
