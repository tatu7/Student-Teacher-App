import React, { useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, notifyGroupInvitation } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

export default function CreateGroupScreen() {
	const { user } = useAuth();
	const [groupName, setGroupName] = useState("");
	const [studentEmails, setStudentEmails] = useState("");
	const [loading, setLoading] = useState(false);

	const handleCreateGroup = async () => {
		// Validate input
		if (!groupName.trim()) {
			Alert.alert("Error", "Please enter a group name");
			return;
		}

		try {
			setLoading(true);

			// Create the group
			const { data: groupData, error: groupError } = await supabase
				.from("groups")
				.insert({
					name: groupName.trim(),
					teacher_id: user?.id,
				})
				.select();

			if (groupError) throw groupError;

			const newGroupId = groupData[0].id;

			// Process student emails (if any)
			if (studentEmails.trim()) {
				const emails = studentEmails
					.split(",")
					.map((email) => email.trim())
					.filter((email) => {
						// Basic email validation
						const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
						return regex.test(email);
					});

				if (emails.length > 0) {
					// Prepare student data for insertion
					const studentsToInsert = emails.map((email) => ({
						group_id: newGroupId,
						student_email: email,
						status: "pending",
					}));

					// Insert students into group_students table
					const { error: studentsError } = await supabase
						.from("group_students")
						.insert(studentsToInsert);

					if (studentsError) {
						console.error("Error adding students:", studentsError);
						Alert.alert(
							"Partial Success",
							"Group created but there was an issue adding some students."
						);
					} else {
						// Send notifications to all added students
						try {
							// Get user IDs for the emails
							const { data: userProfiles } = await supabase
								.from("user_profiles")
								.select("id")
								.in("email", emails);

							if (userProfiles) {
								await Promise.all(
									userProfiles.map((profile) =>
										notifyGroupInvitation({
											studentId: profile.id,
											groupName,
											groupId: newGroupId,
										})
									)
								);
							}
						} catch (notifyError) {
							console.error("Error sending notifications:", notifyError);
							// Don't block group creation if notifications fail
						}
					}
				}
			}

			Alert.alert("Success", "Group created successfully", [
				{
					text: "OK",
					onPress: () => router.back(),
				},
			]);
		} catch (error) {
			console.error("Error creating group:", error);
			Alert.alert("Error", "Failed to create group");
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Create Group",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidView}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps='handled'>
					<View style={styles.formContainer}>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Group Name</Text>
							<TextInput
								style={styles.input}
								placeholder='Enter group name'
								value={groupName}
								onChangeText={setGroupName}
								autoCapitalize='words'
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Student Emails</Text>
							<Text style={styles.inputHelper}>
								Enter comma-separated email addresses
							</Text>
							<TextInput
								style={[styles.input, styles.multilineInput]}
								placeholder='student1@example.com, student2@example.com'
								value={studentEmails}
								onChangeText={setStudentEmails}
								autoCapitalize='none'
								keyboardType='email-address'
								multiline
								numberOfLines={4}
							/>
						</View>

						<View style={styles.infoBox}>
							<Ionicons
								name='information-circle-outline'
								size={20}
								color='#3f51b5'
								style={styles.infoIcon}
							/>
							<Text style={styles.infoText}>
								You can also add students later after creating the group.
							</Text>
						</View>

						<TouchableOpacity
							style={styles.createButton}
							onPress={handleCreateGroup}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.createButtonText}>Create Group</Text>
							)}
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	keyboardAvoidView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
	},
	formContainer: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	inputGroup: {
		marginBottom: 20,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		color: "#333",
	},
	inputHelper: {
		fontSize: 14,
		color: "#666",
		marginBottom: 8,
	},
	input: {
		backgroundColor: "#f5f7fa",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e6ed",
		fontSize: 16,
	},
	multilineInput: {
		minHeight: 100,
		textAlignVertical: "top",
	},
	infoBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "#e8eaf6",
		borderRadius: 8,
		padding: 12,
		marginBottom: 24,
	},
	infoIcon: {
		marginRight: 8,
		marginTop: 2,
	},
	infoText: {
		flex: 1,
		fontSize: 14,
		color: "#3f51b5",
		lineHeight: 20,
	},
	createButton: {
		backgroundColor: "#3f51b5",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		shadowColor: "#3f51b5",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	createButtonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
});
