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
import { router } from "expo-router";
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
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			);
		}

		if (avatarUrl) {
			return (
				<View style={styles.avatarContainer}>
					<Image source={{ uri: avatarUrl }} style={styles.avatar} />
					<TouchableOpacity
						style={styles.changeAvatarButton}
						onPress={pickImage}>
						<Ionicons name='camera' size={20} color='white' />
					</TouchableOpacity>
				</View>
			);
		}

		// No avatar - render first letter in circle
		const firstLetter = profile?.name?.charAt(0).toUpperCase() || "O";
		return (
			<View style={styles.avatarContainer}>
				<View style={[styles.avatar, styles.avatarPlaceholder]}>
					<Text style={styles.avatarLetterText}>{firstLetter}</Text>
				</View>
				<TouchableOpacity style={styles.changeAvatarButton} onPress={pickImage}>
					<Ionicons name='camera' size={20} color='white' />
				</TouchableOpacity>
			</View>
		);
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loaderContainer}>
					<ActivityIndicator size='large' color='#4169E1' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Profil</Text>
			</View>

			<ScrollView
				style={styles.scrollContainer}
				showsVerticalScrollIndicator={false}>
				<View style={styles.profileCard}>
					{renderProfileImage()}
					<Text style={styles.profileName}>{profile?.name || "O'quvchi"}</Text>
					<Text style={styles.profileRole}>Student</Text>
				</View>

				<View style={styles.infoSection}>
					<Text style={styles.sectionTitle}>Shaxsiy ma'lumotlar</Text>

					<View style={styles.infoRow}>
						<Ionicons
							name='person-outline'
							size={24}
							color='#777'
							style={styles.infoIcon}
						/>
						<View style={styles.infoContent}>
							<Text style={styles.infoLabel}>Ism va familya</Text>
							<Text style={styles.infoValue}>
								{profile?.name || "O'quvchi"}
							</Text>
						</View>
					</View>

					<View style={styles.divider} />

					<View style={styles.infoRow}>
						<Ionicons
							name='mail-outline'
							size={24}
							color='#777'
							style={styles.infoIcon}
						/>
						<View style={styles.infoContent}>
							<Text style={styles.infoLabel}>Email</Text>
							<Text style={styles.infoValue}>
								{profile?.email || "student@gmail.com"}
							</Text>
						</View>
					</View>

					<View style={styles.divider} />

					<View style={styles.infoRow}>
						<Ionicons
							name='book-outline'
							size={24}
							color='#777'
							style={styles.infoIcon}
						/>
						<View style={styles.infoContent}>
							<Text style={styles.infoLabel}>Holati</Text>
							<Text style={styles.infoValue}>Student</Text>
						</View>
					</View>
				</View>

				<View style={styles.actionSection}>
					<Text style={styles.sectionTitle}>Ilova sozlamalari</Text>

					<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
						<Ionicons
							name='log-out-outline'
							size={24}
							color='#F44336'
							style={styles.logoutIcon}
						/>
						<Text style={styles.logoutText}>Chiqish</Text>
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
	scrollContainer: {
		flex: 1,
	},
	loaderContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		backgroundColor: "#4169E1",
		paddingTop: 50,
		paddingBottom: 20,
		paddingHorizontal: 16,
		position: "relative",
		zIndex: 99,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	profileCard: {
		backgroundColor: "white",
		borderRadius: 16,
		marginHorizontal: 16,
		marginTop: 6,
		padding: 20,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	avatarContainer: {
		alignItems: "center",
		position: "relative",
		marginBottom: 16,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
	},
	avatarPlaceholder: {
		backgroundColor: "#4169E1",
		justifyContent: "center",
		alignItems: "center",
	},
	avatarLetterText: {
		fontSize: 48,
		fontWeight: "bold",
		color: "white",
	},
	changeAvatarButton: {
		position: "absolute",
		bottom: 0,
		right: 0,
		backgroundColor: "#4169E1",
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "white",
	},
	profileName: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginTop: 8,
	},
	profileRole: {
		fontSize: 16,
		color: "#666",
		marginTop: 4,
	},
	infoSection: {
		backgroundColor: "white",
		borderRadius: 16,
		marginHorizontal: 16,
		marginTop: 20,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 16,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
	},
	infoIcon: {
		marginRight: 16,
	},
	infoContent: {
		flex: 1,
	},
	infoLabel: {
		fontSize: 14,
		color: "#888",
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 16,
		color: "#333",
		fontWeight: "500",
	},
	divider: {
		height: 1,
		backgroundColor: "#eee",
	},
	actionSection: {
		backgroundColor: "white",
		borderRadius: 16,
		marginHorizontal: 16,
		marginTop: 20,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
		marginBottom: 30,
	},
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
	},
	logoutIcon: {
		marginRight: 16,
	},
	logoutText: {
		fontSize: 16,
		color: "#F44336",
		fontWeight: "500",
	},
});
