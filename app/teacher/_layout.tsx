import { Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../lib/supabase";
import { useEffect } from "react";
import { router } from "expo-router";

export default function TeacherLayout() {
	const { user, loading } = useAuth();

	// Role-based navigation guard
	useEffect(() => {
		if (!loading && (!user || user.role !== UserRole.TEACHER)) {
			// Redirect to login if not authenticated or not a teacher
			router.replace("/auth/login");
		}
	}, [user, loading]);

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
			}}
		/>
	);
}
