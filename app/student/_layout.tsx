import { Stack, useSegments } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../lib/supabase";
import { useEffect } from "react";
import { router } from "expo-router";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../context/NotificationsContext";

export default function StudentLayout() {
	const { user, loading } = useAuth();
	const segments = useSegments();
	const { unreadCount } = useNotifications();

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
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: "white",
				},
				headerTitleStyle: {
					fontWeight: "bold",
				},
				headerShadowVisible: false,
				headerLeft: () => (
					<TouchableOpacity
						onPress={() => router.push("/student/profile" as any)}
						style={{ marginLeft: 15 }}>
						<Ionicons name='person-circle' size={28} color='#3f51b5' />
					</TouchableOpacity>
				),
				headerRight: () => (
					<TouchableOpacity
						onPress={() => router.push("/student/notifications")}
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginRight: 15,
						}}>
						<Ionicons name='notifications' size={24} color='#3f51b5' />
						{unreadCount > 0 && (
							<View
								style={{
									position: "absolute",
									right: -6,
									top: -6,
									backgroundColor: "red",
									borderRadius: 10,
									width: 18,
									height: 18,
									justifyContent: "center",
									alignItems: "center",
								}}>
								<Text style={{ color: "white", fontSize: 12 }}>
									{unreadCount > 9 ? "9+" : unreadCount}
								</Text>
							</View>
						)}
					</TouchableOpacity>
				),
			}}>
			<Stack.Screen name='dashboard' options={{ title: "Dashboard" }} />
			<Stack.Screen name='groups' options={{ title: "My Groups" }} />
			<Stack.Screen name='notifications' options={{ title: "Notifications" }} />
			{/* Other student screens */}
		</Stack>
	);
}
