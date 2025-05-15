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
	Image,
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
	student_name: string;
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

			// Get student profile
			const { data: profileData, error: profileError } = await supabase
				.from("user_profiles")
				.select("id, name, display_name")
				.eq("id", data.student_id)
				.single();

			let studentFullName = studentName;
			if (!profileError && profileData) {
				studentFullName =
					profileData.display_name || profileData.name || studentName;
			}

			const formattedSubmission = {
				id: data.id,
				task_id: data.task_id,
				student_id: data.student_id,
				student_name: studentFullName,
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
			Alert.alert(
				"Xatolik",
				"Javob ma'lumotlarini yuklashda muammo yuzaga keldi"
			);
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

			Alert.alert("Muvaffaqiyatli", "Baho va fikr muvaffaqiyatli saqlandi");
		} catch (error) {
			console.error("Error saving rating:", error);
			Alert.alert("Xatolik", "Baho va fikrni saqlashda muammo yuzaga keldi");
		} finally {
			setSaving(false);
		}
	};

	const handleRatingPress = (value: number) => {
		setRating(value);
	};

	const renderRatingStars = () => {
		const stars = [];
		for (let i = 1; i <= 5; i++) {
			stars.push(
				<TouchableOpacity
					key={i}
					style={styles.starContainer}
					onPress={() => handleRatingPress(i)}>
					<Ionicons
						name={i <= (rating || 0) ? "star" : "star-outline"}
						size={36}
						color={i <= (rating || 0) ? "#FFD700" : "#ccc"}
					/>
				</TouchableOpacity>
			);
		}
		return <View style={styles.starsContainer}>{stars}</View>;
	};

	const openAttachment = () => {
		if (submission?.attachment_url) {
			// Handle opening the attachment
			Alert.alert("Ilova", "Ilovani ko'rish funksiyasi ishlab chiqilmoqda");
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: "Javob tafsilotlari" }} />
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Javob tafsilotlari",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<ScrollView style={styles.content}>
				{/* Header with task info */}
				<View style={styles.header}>
					<Text style={styles.taskName}>{taskName}</Text>
					<View style={styles.submissionMeta}>
						<View style={styles.metaItem}>
							<Ionicons name='person' size={18} color='#4169E1' />
							<Text style={styles.metaText}>{submission?.student_name}</Text>
						</View>
						<View style={styles.metaItem}>
							<Ionicons name='calendar' size={18} color='#4169E1' />
							<Text style={styles.metaText}>
								{new Date(submission?.submitted_at || "").toLocaleDateString()}
							</Text>
						</View>
					</View>
				</View>

				{/* Content */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Javob mazmuni:</Text>
					<Text style={styles.contentText}>
						{submission?.content || "Mazmun mavjud emas"}
					</Text>
				</View>

				{/* Attachment (if any) */}
				{submission?.attachment_url && (
					<View style={styles.card}>
						<Text style={styles.sectionLabel}>Ilova:</Text>
						<TouchableOpacity
							style={styles.attachmentButton}
							onPress={openAttachment}>
							<Ionicons name='document-attach' size={20} color='#4169E1' />
							<Text style={styles.attachmentText}>Ilovani ko'rish</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Rating Section */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Baholang:</Text>
					{renderRatingStars()}
					<Text style={styles.ratingValue}>
						{rating !== null ? `${rating}/5` : "Baholanmagan"}
					</Text>
				</View>

				{/* Feedback Section */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Fikr-mulohaza:</Text>
					<TextInput
						style={styles.feedbackInput}
						placeholder="O'quvchi uchun fikr-mulohaza yozing"
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
						<Text style={styles.saveButtonText}>Saqlash</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		padding: 16,
	},
	header: {
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
	taskName: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 12,
	},
	submissionMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	metaText: {
		fontSize: 15,
		color: "#666",
		marginLeft: 6,
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
	sectionLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 12,
	},
	contentText: {
		fontSize: 15,
		color: "#444",
		lineHeight: 22,
	},
	attachmentButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#EFF3FF",
		padding: 12,
		borderRadius: 8,
	},
	attachmentText: {
		fontSize: 15,
		color: "#4169E1",
		marginLeft: 8,
		fontWeight: "500",
	},
	starsContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginVertical: 16,
	},
	starContainer: {
		padding: 5,
	},
	ratingValue: {
		textAlign: "center",
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	feedbackInput: {
		backgroundColor: "#F5F7FA",
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: "#333",
		minHeight: 120,
		textAlignVertical: "top",
	},
	saveButton: {
		backgroundColor: "#4169E1",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		marginBottom: 30,
	},
	saveButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});
