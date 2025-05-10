import React from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	SafeAreaView,
	StyleSheet,
} from "react-native";
import { Stack } from "expo-router";
import { useNotifications } from "../../context/NotificationsContext";

export default function NotificationsScreen() {
	const { notifications, markAsRead, refresh } = useNotifications();

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Notifications",
					headerTitleStyle: {
						fontWeight: "bold",
					},
				}}
			/>

			<FlatList
				data={notifications}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[styles.card, !item.is_read && styles.unreadCard]}
						onPress={() => markAsRead(item.id)}>
						<Text style={styles.title}>{item.data.message}</Text>
						<Text style={styles.date}>
							{new Date(item.created_at).toLocaleString()}
						</Text>
					</TouchableOpacity>
				)}
				contentContainerStyle={styles.list}
				refreshing={false}
				onRefresh={refresh}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	list: {
		padding: 16,
	},
	card: {
		backgroundColor: "white",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 1,
	},
	unreadCard: {
		backgroundColor: "#f0f6ff",
	},
	title: {
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 8,
	},
	date: {
		fontSize: 12,
		color: "#666",
	},
});
