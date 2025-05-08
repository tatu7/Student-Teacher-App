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
			router.replace("/auth/login");
		}
		// If user is signed in and is on an auth screen, redirect based on role
		else if (user && inAuthGroup) {
			if (user.role === "teacher") {
				router.replace("/teacher/dashboard");
			} else {
				router.replace("/student/dashboard");
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
			<RootNavigationGuard>
				<ThemeProvider
					value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
					<Stack>
						<Stack.Screen name='(tabs)' options={{ headerShown: false }} />
						<Stack.Screen name='auth' options={{ headerShown: false }} />
						<Stack.Screen name='teacher' options={{ headerShown: false }} />
						<Stack.Screen name='student' options={{ headerShown: false }} />
						<Stack.Screen name='+not-found' />
					</Stack>
					<StatusBar style='auto' />
				</ThemeProvider>
			</RootNavigationGuard>
		</AuthProvider>
	);
}
