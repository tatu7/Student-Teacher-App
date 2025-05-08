import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { router, usePathname } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabsLayout() {
	const { user, loading } = useAuth();
	const pathname = usePathname();
	const colorScheme = useColorScheme();

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.replace("/auth/login");
		}
	}, [user, loading, pathname]);

	if (!user) {
		return null; // Don't render anything if not authenticated
	}

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
				headerShown: false,
				tabBarButton: HapticTab,
				tabBarBackground: TabBarBackground,
				tabBarStyle: Platform.select({
					ios: {
						// Use a transparent background on iOS to show the blur effect
						position: "absolute",
					},
					default: {},
				}),
			}}>
			<Tabs.Screen
				name='index'
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name='house.fill' color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='explore'
				options={{
					title: "Explore",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name='paperplane.fill' color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
