import { Stack } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";

export default function RootLayout() {
	return <RootLayoutNav />;
}

function RootLayoutNav() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#007AFF",
				tabBarInactiveTintColor: "#8E8E93",
				tabBarStyle: {
					backgroundColor: "#FFFFFF",
					borderTopWidth: 1,
					borderTopColor: "#E5E5EA",
					height: 60,
					paddingBottom: 5,
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "500",
				},
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Kalendar",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="calendar-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="hujjatlar"
				options={{
					title: "Ensiklopediya",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="document-text-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="xarita"
				options={{
					title: "Xarita",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="map-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="ai-inspektor"
				options={{
					title: "Inspektor",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="sparkles-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="musobaqa"
				options={{
					title: "Musobaqa",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="trophy-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person-outline" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
