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
	Dimensions,
	useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../context/NotificationsContext";

export default function StudentLayout() {
	const { user, loading } = useAuth();
	const segments = useSegments();
	const { unreadCount } = useNotifications();
	const [currentTitle, setCurrentTitle] = useState("Dashboard");
	const { width: screenWidth } = useWindowDimensions();

	// Determine if we're on a small screen
	const isSmallScreen = screenWidth < 380;

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

	// Calculate tab bar height and padding based on screen size
	const tabBarHeight = isSmallScreen ? 50 : 60;
	const tabBarPaddingBottom = isSmallScreen ? 4 : 8;
	const tabBarPaddingTop = isSmallScreen ? 4 : 6;
	const iconSize = isSmallScreen ? 20 : 24;

	// For small screens, we'll configure which tabs to show and which to hide in the "More" menu
	// On very small screens, we'll only show the most important tabs
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

			{!isSmallScreen ? (
				<Tabs.Screen
					name='grades'
					options={{
						title: "Baholar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='star-outline' size={iconSize} color={color} />
						),
					}}
				/>
			) : (
				<Tabs.Screen
					name='grades'
					options={{
						title: "Baholar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='star-outline' size={iconSize} color={color} />
						),
						href: screenWidth < 320 ? null : undefined,
					}}
				/>
			)}

			{!isSmallScreen ? (
				<Tabs.Screen
					name='calendar'
					options={{
						title: "Kalendar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='calendar-outline' size={iconSize} color={color} />
						),
					}}
				/>
			) : (
				<Tabs.Screen
					name='calendar'
					options={{
						title: "Kalendar",
						tabBarIcon: ({ color }) => (
							<Ionicons name='calendar-outline' size={iconSize} color={color} />
						),
						href: screenWidth < 320 ? null : undefined,
					}}
				/>
			)}

			<Tabs.Screen
				name='ratings'
				options={{
					title: isSmallScreen ? "Rating" : "Reyting",
					tabBarIcon: ({ color }) => (
						<Ionicons name='trophy-outline' size={iconSize} color={color} />
					),
					href: screenWidth < 320 ? null : undefined,
				}}
			/>
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
									style={[styles.badge, isSmallScreen && styles.smallBadge]}>
									<Text
										style={[
											styles.badgeText,
											isSmallScreen && styles.smallBadgeText,
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
	smallBadge: {
		right: -4,
		top: -4,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 1.5,
	},
	badgeText: {
		color: "white",
		fontSize: 11,
		fontWeight: "bold",
	},
	smallBadgeText: {
		fontSize: 9,
	},
});
