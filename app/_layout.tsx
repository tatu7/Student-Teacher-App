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
		const isOnboarding = segments[0] === "onboarding";
		const isRootPath = segments.join("/") === "";

		// For debugging
		console.log("Navigation guard checking paths:", {
			segments,
			inAuthGroup,
			isOnboarding,
			isRootPath,
			hasUser: !!user,
		});

		// Handle unauthenticated users
		if (!user) {
			// Allow access to auth screens, onboarding, and confirm page without auth
			if (inAuthGroup || isOnboarding || isRootPath) {
				// Special case for confirmation page
				if (inAuthGroup && segments[1] === "confirm") {
					return;
				}
				return; // Allow staying on these screens
			}

			// For all other paths, redirect to onboarding
			console.log("Redirecting unauthenticated user to onboarding");
			router.replace("/onboarding");
			return;
		}

		// Handle authenticated users
		if (user) {
			// Don't redirect if on the confirmation page
			if (inAuthGroup && segments[1] === "confirm") {
				return;
			}

			// If authenticated and on auth or onboarding, redirect to dashboard
			if (inAuthGroup || isOnboarding || isRootPath) {
				const targetPath =
					user.role === UserRole.TEACHER
						? "/teacher/dashboard"
						: "/student/dashboard";

				console.log(`Redirecting authenticated user to ${targetPath}`);
				router.replace(targetPath);
				return;
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
							<Stack.Screen
								name='onboarding'
								options={{ headerShown: false }}
							/>
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
