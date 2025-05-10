import { Stack, useSegments } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
	TouchableOpacity,
	Text,
	View,
	StyleSheet,
	SafeAreaView,
	StatusBar,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../context/NotificationsContext";

export default function TeacherLayout() {
	const { user, loading } = useAuth();
	const segments = useSegments();
	const { unreadCount } = useNotifications();
	const [currentTitle, setCurrentTitle] = useState("Dashboard");

	// Set the title based on the current route
	useEffect(() => {
		if (segments.length > 1) {
			const route = segments[1];
			switch (route) {
				case "dashboard":
					setCurrentTitle("Dashboard");
					break;
				case "groups":
					setCurrentTitle("Groups");
					break;
				case "tasks":
					setCurrentTitle("Tasks");
					break;
				case "notifications":
					setCurrentTitle("Notifications");
					break;
				case "profile":
					setCurrentTitle("Profile");
					break;
				default:
					setCurrentTitle("Dashboard");
			}
		}
	}, [segments]);

	// Role-based navigation guard
	useEffect(() => {
		if (!loading && (!user || user.role !== UserRole.TEACHER)) {
			// Only redirect if we're not already on the login page
			if (segments.join("/") !== "auth/login") {
				// Redirect to login if not authenticated or not a teacher
				router.replace("/auth/login");
			}
		}
	}, [user, loading, segments]);

	// Show nothing while checking authentication
	if (loading || !user) return null;

	// Custom header component
	const CustomHeader = () => (
		<SafeAreaView style={styles.headerContainer}>
			<StatusBar barStyle='dark-content' />
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.push("/teacher/profile" as any)}
					style={styles.profileButton}>
					<Ionicons name='person-circle' size={30} color='#3f51b5' />
				</TouchableOpacity>

				<Text style={styles.headerTitle}>{currentTitle}</Text>
			</View>
		</SafeAreaView>
	);

	return (
		<View style={styles.container}>
			<CustomHeader />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name='dashboard' />
				<Stack.Screen name='groups' />
				<Stack.Screen name='tasks' />
				<Stack.Screen name='submissions' />
				<Stack.Screen name='notifications' />
				<Stack.Screen name='profile' />
				{/* Other teacher screens */}
			</Stack>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	headerContainer: {
		backgroundColor: "white",
		paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
		zIndex: 1000,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333",
	},
	profileButton: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 22,
	},
	notificationButton: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 22,
		position: "relative",
	},
	badge: {
		position: "absolute",
		right: 0,
		top: 0,
		backgroundColor: "#f44336",
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: "white",
	},
	badgeText: {
		color: "white",
		fontSize: 11,
		fontWeight: "bold",
	},
});
