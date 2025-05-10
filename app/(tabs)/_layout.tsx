import { Tabs } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../../context/NotificationsContext";
import { View, Text } from "react-native";

export default function TabLayout() {
	const { colors } = useTheme();
	const { unreadCount } = useNotifications();

	return (
		<Tabs
			screenOptions={{
				tabBarStyle: {
					backgroundColor: colors.card,
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.text,
				headerStyle: {
					backgroundColor: colors.card,
				},
				headerTintColor: colors.text,
			}}>
			<Tabs.Screen
				name='index'
				options={{
					title: "Dashboard",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='home-outline' size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name='notifications'
				options={{
					title: "Notifications",
					tabBarIcon: ({ color, size }) => (
						<View>
							<Ionicons
								name='notifications-outline'
								size={size}
								color={color}
							/>
							{unreadCount > 0 && (
								<View
									style={{
										position: "absolute",
										right: -6,
										top: -6,
										backgroundColor: colors.primary,
										borderRadius: 10,
										minWidth: 20,
										height: 20,
										justifyContent: "center",
										alignItems: "center",
									}}>
									<Text
										style={{
											color: "#fff",
											fontSize: 12,
											fontWeight: "bold",
										}}>
										{unreadCount > 99 ? "99+" : unreadCount}
									</Text>
								</View>
							)}
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name='profile'
				options={{
					title: "Profile",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='person-outline' size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
