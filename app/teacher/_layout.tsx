import { Tabs, Stack, useSegments } from "expo-router";
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
	useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../context/NotificationsContext";

export default function TeacherLayout() {
	const { user, loading } = useAuth();
	const segments = useSegments();
	const { unreadCount } = useNotifications();
	const [currentTitle, setCurrentTitle] = useState("Dashboard");
	const { width: screenWidth } = useWindowDimensions();

	// Determine if we're on a small screen
	const isSmallScreen = screenWidth < 380;
	const isVerySmallScreen = screenWidth < 320;

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
				case "submissions":
					setCurrentTitle("Submissions");
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

	// Calculate tab bar height and padding based on screen size
	const tabBarHeight = isSmallScreen ? 60 : 65;
	const tabBarPaddingBottom = isSmallScreen ? 8 : 10;
	const tabBarPaddingTop = isSmallScreen ? 8 : 8;
	const iconSize = isSmallScreen ? 20 : 24;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#3f51b5",
				tabBarInactiveTintColor: "#687076",
				tabBarStyle: {
					backgroundColor: "white",
					borderTopColor: "#e0e0e0",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -2 },
					shadowOpacity: 0.1,
					shadowRadius: 3,
					elevation: 3,
					height: tabBarHeight,
					paddingBottom: tabBarPaddingBottom,
					paddingTop: tabBarPaddingTop,
				},
				tabBarLabelStyle: {
					fontSize: isSmallScreen ? 10 : 12,
					fontWeight: "500",
					marginTop: isSmallScreen ? -2 : 0,
				},
				lazy: true,
			}}>
			<Tabs.Screen
				name='dashboard'
				options={{
					title: isSmallScreen ? "Bosh" : "Bosh sahifa",
					tabBarIcon: ({ color }) => (
						<Ionicons name='home-outline' size={iconSize} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='groups'
				options={{
					title: "Guruhlar",
					tabBarIcon: ({ color }) => (
						<Ionicons name='people-outline' size={iconSize} color={color} />
					),
				}}
			/>

			{!isVerySmallScreen ? (
				<Tabs.Screen
					name='submissions'
					options={{
						title: isSmallScreen ? "Javob" : "Javoblar",
						tabBarIcon: ({ color }) => (
							<Ionicons
								name='checkmark-done-outline'
								size={iconSize}
								color={color}
							/>
						),
					}}
				/>
			) : (
				<Tabs.Screen
					name='submissions'
					options={{
						title: "Javoblar",
						tabBarIcon: ({ color }) => (
							<Ionicons
								name='checkmark-done-outline'
								size={iconSize}
								color={color}
							/>
						),
						href: null, // Hide on very small screens
					}}
				/>
			)}

			{!isVerySmallScreen ? (
				<Tabs.Screen
					name='calendar'
					options={{
						title: isSmallScreen ? "Kalen." : "Calendar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='calendar-outline' size={iconSize} color={color} />
						),
						href: isSmallScreen ? null : undefined,
					}}
				/>
			) : (
				<Tabs.Screen
					name='calendar'
					options={{
						title: "Calendar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='calendar-outline' size={iconSize} color={color} />
						),
						href: null, // Hide on very small screens
					}}
				/>
			)}

			{!isVerySmallScreen ? (
				<Tabs.Screen
					name='ratings'
					options={{
						title: isSmallScreen ? "Rating" : "Reyting",
						tabBarIcon: ({ color }) => (
							<Ionicons name='trophy-outline' size={iconSize} color={color} />
						),
					}}
				/>
			) : (
				<Tabs.Screen
					name='ratings'
					options={{
						title: "Reyting",
						tabBarIcon: ({ color }) => (
							<Ionicons name='trophy-outline' size={iconSize} color={color} />
						),
						href: null, // Hide on very small screens
					}}
				/>
			)}

			<Tabs.Screen
				name='profile'
				options={{
					title: "Profil",
					tabBarIcon: ({ color }) => (
						<Ionicons name='person-outline' size={iconSize} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='notifications'
				options={{
					title: isSmallScreen ? "Xabar" : "Xabarlar",
					tabBarIcon: ({ color }) => (
						<View>
							<Ionicons
								name='notifications-outline'
								size={iconSize}
								color={color}
							/>
							{unreadCount > 0 && (
								<View
									style={[styles.badge, isSmallScreen && styles.badgeSmall]}>
									<Text
										style={[
											styles.badgeText,
											isSmallScreen && styles.badgeTextSmall,
										]}>
										{unreadCount > 99 ? "99+" : unreadCount}
									</Text>
								</View>
							)}
						</View>
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
	badgeSmall: {
		right: -4,
		top: -4,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 1.5,
		paddingHorizontal: 2,
	},
	badgeText: {
		color: "white",
		fontSize: 11,
		fontWeight: "bold",
	},
	badgeTextSmall: {
		fontSize: 9,
	},
});
