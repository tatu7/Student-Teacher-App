import { Tabs, useSegments } from "expo-router";
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

export default function StudentLayout() {
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
					setCurrentTitle("My Groups");
					break;
				case "tasks":
					setCurrentTitle("Vazifalar");
					break;
				case "grades":
					setCurrentTitle("Baholar");
					break;
				case "calendar":
					setCurrentTitle("Calendar");
					break;
				case "notifications":
					setCurrentTitle("Notifications");
					break;
				case "profile":
					setCurrentTitle("Profile");
					break;
				case "ratings":
					setCurrentTitle("Reyting");
					break;
				default:
					setCurrentTitle("Dashboard");
			}
		}
	}, [segments]);

	// Role-based navigation guard
	useEffect(() => {
		if (!loading && (!user || user.role !== UserRole.STUDENT)) {
			// Only redirect if we're not already on the login page
			if (segments.join("/") !== "auth/login") {
				// Redirect to login if not authenticated or not a student
				router.replace("/auth/login");
			}
		}
	}, [user, loading, segments]);

	// Show nothing while checking authentication
	if (loading || !user) return null;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#4169E1",
				tabBarInactiveTintColor: "#687076",
				tabBarStyle: {
					backgroundColor: "white",
					borderTopColor: "#e0e0e0",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -2 },
					shadowOpacity: 0.1,
					shadowRadius: 3,
					elevation: 3,
					height: 60,
					paddingBottom: 8,
					paddingTop: 6,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "500",
				},
			}}>
			<Tabs.Screen
				name='dashboard'
				options={{
					title: "Bosh sahifa",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='home-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='groups'
				options={{
					title: "Guruhlar",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='people-outline' size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name='grades'
				options={{
					title: "Baholar",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='star-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='calendar'
				options={{
					title: "Kalendar",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='calendar-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='profile'
				options={{
					title: "Profil",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='person-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='notifications'
				options={{
					title: "Xabarlar",
					tabBarIcon: ({ color, size }) => (
						<View>
							<Ionicons
								name='notifications-outline'
								size={size}
								color={color}
							/>
							{unreadCount > 0 && (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{unreadCount > 99 ? "99+" : unreadCount}
									</Text>
								</View>
							)}
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name='ratings'
				options={{
					title: "Reyting",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='trophy-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='tasks'
				options={{
					href: null,
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	badge: {
		position: "absolute",
		right: -6,
		top: -6,
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
