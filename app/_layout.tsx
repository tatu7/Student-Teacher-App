import React, { useEffect } from "react";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { UserRole } from "../lib/supabase";
import { NotificationsProvider } from "../context/NotificationsContext";

// Auth navigation guard component
function RootNavigationGuard({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		if (loading) return; // Wait for auth state to be checked

		const inAuthGroup = segments[0] === "auth";

		// If user isn't signed in and isn't on an auth screen, redirect to login
		if (!user && !inAuthGroup) {
			// Allow access to the email confirmation page without authentication
			if (inAuthGroup && segments[1] === "confirm") {
				return;
			}

			// Only redirect if we're not already on the login page
			if (segments.join("/") !== "auth/login") {
				router.replace("/auth/login");
			}
		}
		// If user is signed in and is on an auth screen, redirect based on role
		else if (user && inAuthGroup) {
			// Skip redirecting if on the email confirmation page
			if (segments[1] === "confirm") {
				return;
			}

			const targetPath =
				user.role === UserRole.TEACHER
					? "/teacher/dashboard"
					: "/student/dashboard";

			// Only redirect if we're not already at the target path
			if (segments.join("/") !== targetPath.substring(1)) {
				router.replace(targetPath);
			}
		}
	}, [user, loading, segments]);

	return <>{children}</>;
}

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	if (!loaded) {
		// Async font loading only occurs in development.
		return null;
	}

	return (
		<AuthProvider>
			<NotificationsProvider>
				<ThemeProvider
					value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
					<RootNavigationGuard>
						<Stack>
							<Stack.Screen name='auth' options={{ headerShown: false }} />
							<Stack.Screen name='teacher' options={{ headerShown: false }} />
							<Stack.Screen name='student' options={{ headerShown: false }} />
							<Stack.Screen name='+not-found' />
						</Stack>
						<StatusBar style='auto' />
					</RootNavigationGuard>
				</ThemeProvider>
			</NotificationsProvider>
		</AuthProvider>
	);
}
