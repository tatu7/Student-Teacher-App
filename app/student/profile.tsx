import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	TextInput,
	Image,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// Types for profile data
type Profile = {
	id: string;
	email: string;
	name: string | null;
	avatar_url: string | null;
	role: string;
};

export default function StudentProfileScreen() {
	const { user, signOut, resetPassword } = useAuth();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [editMode, setEditMode] = useState(false);

	// Form state
	const [name, setName] = useState("");
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	useEffect(() => {
		if (user) {
			fetchProfile();
		}
	}, [user]);

	const fetchProfile = async () => {
		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("user_profiles")
				.select("*")
				.eq("id", user?.id)
				.single();

			if (error) throw error;

			if (data) {
				setProfile(data as Profile);
				setName(data.name || "");
				setAvatarUrl(data.avatar_url || null);
			}
		} catch (error) {
			console.error("Error fetching profile:", error);
			Alert.alert("Error", "Failed to load profile");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateProfile = async () => {
		if (!user) return;

		try {
			setSaving(true);

			const updates = {
				id: user.id,
				name,
				updated_at: new Date().toISOString(),
			};

			const { error } = await supabase
				.from("user_profiles")
				.update(updates)
				.eq("id", user.id);

			if (error) throw error;

			Alert.alert("Success", "Profile updated successfully");
			setEditMode(false);
			fetchProfile();
		} catch (error) {
			console.error("Error updating profile:", error);
			Alert.alert("Error", "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordReset = async () => {
		if (!user?.email) return;

		try {
			const { error } = await resetPassword(user.email);

			if (error) throw error;

			Alert.alert(
				"Password Reset",
				"A password reset link has been sent to your email"
			);
		} catch (error) {
			console.error("Error sending password reset:", error);
			Alert.alert("Error", "Failed to send password reset email");
		}
	};

	const pickImage = async () => {
		try {
			// Request permissions
			const { status } =
				await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (status !== "granted") {
				Alert.alert(
					"Permission Required",
					"Please allow access to your photos to update your profile picture"
				);
				return;
			}

			// Launch image picker
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const uri = result.assets[0].uri;
				await uploadImage(uri);
			}
		} catch (error) {
			console.error("Error picking image:", error);
			Alert.alert("Error", "Failed to pick image");
		}
	};

	const uploadImage = async (uri: string) => {
		if (!user) return;

		try {
			setUploading(true);

			// Get file extension
			const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
			const fileName = `${user.id}-${Date.now()}.${fileExt}`;
			const filePath = `avatars/${fileName}`;

			// Convert image to blob
			const response = await fetch(uri);
			const blob = await response.blob();

			// Upload to Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from("profiles")
				.upload(filePath, blob);

			if (uploadError) throw uploadError;

			// Get public URL
			const { data: publicUrlData } = supabase.storage
				.from("profiles")
				.getPublicUrl(filePath);

			const publicUrl = publicUrlData?.publicURL;

			if (publicUrl) {
				// Update profile with new avatar URL
				const { error: updateError } = await supabase
					.from("user_profiles")
					.update({ avatar_url: publicUrl })
					.eq("id", user.id);

				if (updateError) throw updateError;

				setAvatarUrl(publicUrl);
				fetchProfile();
				Alert.alert("Success", "Profile picture updated");
			}
		} catch (error) {
			console.error("Error uploading image:", error);
			Alert.alert("Error", "Failed to upload image");
		} finally {
			setUploading(false);
		}
	};

	const handleLogout = async () => {
		Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
			{
				text: "Cancel",
				style: "cancel",
			},
			{
				text: "Logout",
				style: "destructive",
				onPress: async () => {
					try {
						await signOut();
						// Navigation is handled in AuthContext by the auth state change listener
					} catch (error) {
						console.error("Error signing out:", error);
						Alert.alert("Error", "Failed to sign out");
					}
				},
			},
		]);
	};

	const renderProfileImage = () => {
		if (uploading) {
			return (
				<View style={styles.avatarContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			);
		}

		if (avatarUrl) {
			return (
				<View style={styles.avatarContainer}>
					<Image source={{ uri: avatarUrl }} style={styles.avatar} />
					{editMode && (
						<TouchableOpacity
							style={styles.changeAvatarButton}
							onPress={pickImage}>
							<Ionicons name='camera' size={20} color='white' />
						</TouchableOpacity>
					)}
				</View>
			);
		}

		return (
			<View style={styles.avatarContainer}>
				<View style={[styles.avatar, styles.avatarPlaceholder]}>
					<Ionicons name='person' size={60} color='#ccc' />
				</View>
				{editMode && (
					<TouchableOpacity
						style={styles.changeAvatarButton}
						onPress={pickImage}>
						<Ionicons name='camera' size={20} color='white' />
					</TouchableOpacity>
				)}
			</View>
		);
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<Stack.Screen options={{ title: "Profile" }} />
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
					title: "Profile",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerTitleAlign: "center",
				}}
			/>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				{renderProfileImage()}

				<View style={styles.profileInfo}>
					{editMode ? (
						<View style={styles.formField}>
							<Text style={styles.label}>Name</Text>
							<TextInput
								style={styles.input}
								value={name}
								onChangeText={setName}
								placeholder='Enter your name'
							/>
						</View>
					) : (
						<View style={styles.infoField}>
							<Text style={styles.label}>Name</Text>
							<Text style={styles.value}>{profile?.name || "Not set"}</Text>
						</View>
					)}

					<View style={styles.infoField}>
						<Text style={styles.label}>Email</Text>
						<Text style={styles.value}>{profile?.email}</Text>
					</View>

					<View style={styles.infoField}>
						<Text style={styles.label}>Role</Text>
						<Text style={styles.roleValue}>Student</Text>
					</View>
				</View>

				<View style={styles.actionButtonsContainer}>
					{editMode ? (
						<>
							<TouchableOpacity
								style={[styles.actionButton, styles.saveButton]}
								onPress={handleUpdateProfile}
								disabled={saving}>
								{saving ? (
									<ActivityIndicator size='small' color='white' />
								) : (
									<Text style={styles.actionButtonText}>Save Changes</Text>
								)}
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.actionButton, styles.cancelButton]}
								onPress={() => {
									setEditMode(false);
									setName(profile?.name || "");
									setAvatarUrl(profile?.avatar_url || null);
								}}>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</TouchableOpacity>
						</>
					) : (
						<TouchableOpacity
							style={[styles.actionButton, styles.editButton]}
							onPress={() => setEditMode(true)}>
							<Text style={styles.actionButtonText}>Edit Profile</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={[styles.actionButton, styles.passwordButton]}
						onPress={handlePasswordReset}>
						<Text style={styles.actionButtonText}>Reset Password</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.actionButton, styles.logoutButton]}
						onPress={handleLogout}>
						<Text style={styles.actionButtonText}>Logout</Text>
					</TouchableOpacity>
				</View>
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
	scrollContent: {
		flexGrow: 1,
		padding: 20,
	},
	avatarContainer: {
		alignItems: "center",
		marginVertical: 20,
		position: "relative",
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
	},
	avatarPlaceholder: {
		backgroundColor: "#e1e1e1",
		justifyContent: "center",
		alignItems: "center",
	},
	changeAvatarButton: {
		position: "absolute",
		bottom: 0,
		right: "35%",
		backgroundColor: "#3f51b5",
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "white",
	},
	profileInfo: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	infoField: {
		marginBottom: 16,
	},
	formField: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		color: "#666",
		marginBottom: 4,
	},
	value: {
		fontSize: 16,
		color: "#333",
		fontWeight: "500",
	},
	roleValue: {
		fontSize: 16,
		color: "#3f51b5",
		fontWeight: "600",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 10,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
	},
	actionButtonsContainer: {
		marginBottom: 30,
	},
	actionButton: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	editButton: {
		backgroundColor: "#3f51b5",
	},
	saveButton: {
		backgroundColor: "#4caf50",
	},
	cancelButton: {
		backgroundColor: "white",
		borderWidth: 1,
		borderColor: "#ddd",
	},
	cancelButtonText: {
		color: "#666",
		fontWeight: "600",
	},
	passwordButton: {
		backgroundColor: "#ff9800",
	},
	logoutButton: {
		backgroundColor: "#f44336",
	},
});
