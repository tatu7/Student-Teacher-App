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
import * as FileSystem from "expo-file-system";
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
	const { user, signOut } = useAuth();
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
				mediaTypes: "images",
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

			// Ensure URI is valid
			if (!uri.startsWith("file://") && Platform.OS === "ios") {
				uri = "file://" + uri;
			}

			// Get file extension
			const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
			const fileName = `${user.id}-${Date.now()}.${fileExt}`;
			const filePath = `avatars/${fileName}`;

			if (Platform.OS === "web") {
				// Web platform handling
				const response = await fetch(uri);
				const blob = await response.blob();

				// Call RPC function to upload file (bypassing RLS)
				const { data: uploadData, error: uploadError } = await supabase.rpc(
					"upload_profile_image",
					{
						bucket_name: "profiles",
						file_path: filePath,
						file_data: await blobToBase64(blob),
						content_type: `image/${fileExt}`,
					}
				);

				if (uploadError) throw uploadError;
			} else {
				// Native platforms (iOS/Android)
				try {
					let fileUri = uri;

					// Get file info
					const fileInfo = await FileSystem.getInfoAsync(fileUri);

					if (!fileInfo.exists) {
						throw new Error("File does not exist");
					}

					// Read file as base64 string
					const fileContent = await FileSystem.readAsStringAsync(fileUri, {
						encoding: FileSystem.EncodingType.Base64,
					});

					// Call RPC function to upload file (bypassing RLS)
					const { data: uploadData, error: uploadError } = await supabase.rpc(
						"upload_profile_image",
						{
							bucket_name: "profiles",
							file_path: filePath,
							file_data: fileContent,
							content_type: `image/${fileExt}`,
						}
					);

					if (uploadError) throw uploadError;
				} catch (readError) {
					console.error("Error reading file:", readError);
					Alert.alert("Error", "Failed to read image file");
					return;
				}
			}

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

	// Helper function to convert blob to base64
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const base64String = reader.result as string;
				// Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
				const base64 = base64String.split(",")[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
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
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Profil</Text>
				{!editMode && (
					<TouchableOpacity
						style={styles.headerButton}
						onPress={() => setEditMode(true)}>
						<Ionicons name='pencil' size={24} color='#3f51b5' />
					</TouchableOpacity>
				)}
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
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
									<>
										<Ionicons
											name='checkmark-circle'
											size={22}
											color='white'
											style={styles.buttonIcon}
										/>
										<Text style={styles.actionButtonText}>Save Changes</Text>
									</>
								)}
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.actionButton, styles.cancelButton]}
								onPress={() => {
									setEditMode(false);
									setName(profile?.name || "");
									setAvatarUrl(profile?.avatar_url || null);
								}}>
								<Ionicons
									name='close-circle'
									size={22}
									color='#666'
									style={styles.buttonIcon}
								/>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</TouchableOpacity>
						</>
					) : (
						<TouchableOpacity
							style={[styles.actionButton, styles.editButton]}
							onPress={() => setEditMode(true)}>
							<Ionicons
								name='create-outline'
								size={22}
								color='white'
								style={styles.buttonIcon}
							/>
							<Text style={styles.actionButtonText}>Edit Profile</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={[styles.actionButton, styles.logoutButton]}
						onPress={handleLogout}>
						<Ionicons
							name='log-out-outline'
							size={22}
							color='white'
							style={styles.buttonIcon}
						/>
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
		paddingHorizontal: 10,
	},
	actionButton: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "white",
	},
	buttonIcon: {
		marginRight: 10,
	},
	editButton: {
		backgroundColor: "#3f51b5",
		borderWidth: 0,
	},
	saveButton: {
		backgroundColor: "#4caf50",
		borderWidth: 0,
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
		borderWidth: 0,
	},
	logoutButton: {
		backgroundColor: "#f44336",
		borderWidth: 0,
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
	headerButton: {
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 20,
	},
	scrollView: {
		flex: 1,
	},
});
