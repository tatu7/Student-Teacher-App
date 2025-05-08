import { Stack } from "expo-router";
import { useAuth, UserRole } from "../../context/AuthContext";
import { useEffect } from "react";
import { router } from "expo-router";

export default function StudentLayout() {
	const { user, loading } = useAuth();

	// Role-based navigation guard
	useEffect(() => {
		if (!loading && (!user || user.role !== UserRole.STUDENT)) {
			// Redirect to login if not authenticated or not a student
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
