import { Stack, useSegments } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../lib/supabase";
import { useEffect } from "react";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StudentLayout() {
	const { user, loading } = useAuth();
	const segments = useSegments();

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
			}}
		/>
	);
}
