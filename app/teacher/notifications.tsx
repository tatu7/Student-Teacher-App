import React, { useEffect, useState } from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	SafeAreaView,
	RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import {
	getUserNotifications,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	NotificationType,
} from "../../lib/supabase";
import { format } from "date-fns";
import CustomBackground from "@/components/CustomBackground";
import { icons } from "@/constants/icons";

type Notification = {
	id: string;
	title: string;
	message: string;
	type: NotificationType;
	is_read: boolean;
	created_at: string;
	related_id?: string;
};

export default function TeacherNotificationsScreen() {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchNotifications = async () => {
		if (!user) return;

		try {
			const { data, error } = await getUserNotifications(user.id);
			if (error) throw error;
			setNotifications(data || []);
		} catch (error) {
			console.error("Error fetching notifications:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchNotifications();
	}, [user]);

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchNotifications();
		setRefreshing(false);
	};

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			await markNotificationAsRead(notificationId);
			setNotifications((prev) =>
				prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
			);
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const handleMarkAllAsRead = async () => {
		if (!user) return;

		try {
			await markAllNotificationsAsRead(user.id);
			setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
		} catch (error) {
			console.error("Error marking all notifications as read:", error);
		}
	};

	const getNotificationIcon = (type: NotificationType) => {
		switch (type) {
			case NotificationType.NEW_SUBMISSION:
				return {
					name: "document-text-outline",
					color: "#4169E1",
				};
			case NotificationType.SUBMISSION_GRADED:
				return {
					name: "checkmark-circle-outline",
					color: "#4CAF50",
				};
			default:
				return {
					name: "notifications-outline",
					color: "#666",
				};
		}
	};

	const renderNotificationItem = ({ item }: { item: Notification }) => {
		const icon = getNotificationIcon(item.type);

		return (
			<TouchableOpacity
				style={[
					styles.notificationItem,
					!item.is_read && styles.unreadNotification,
				]}
				onPress={() => handleMarkAsRead(item.id)}>
				<View style={styles.notificationIcon}>
					<Ionicons name={icon.name as any} size={24} color={icon.color} />
				</View>
				<View style={styles.notificationContent}>
					<Text style={styles.notificationTitle}>{item.type}</Text>
					<Text style={styles.notificationMessage}>{item.message}</Text>
					<Text style={styles.notificationTime}>
						{format(new Date(item.created_at), "MMM d, yyyy HH:mm")}
					</Text>
				</View>
				{!item.is_read && <View style={styles.unreadDot} />}
			</TouchableOpacity>
		);
	};

	const renderEmptyState = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='notifications-off-outline' size={60} color='#DDD' />
			<Text style={styles.emptyText}>Hech qanday bildirishnoma yo'q</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<CustomBackground image={icons.bg4} overlayColor='rgba(0,0,0,0.4)'>
				<Stack.Screen
					options={{
						title: "Bildirishnomalar",
						headerTitleStyle: {
							color: "#fff",
						},
						headerStyle: {
							backgroundColor: "transparent",
						},
						headerRight: () =>
							notifications.some((n) => !n.is_read) ? (
								<TouchableOpacity
									style={styles.markAllButton}
									onPress={handleMarkAllAsRead}>
									<Text style={styles.markAllText}>
										Hammasini o'qilgan deb belgilash
									</Text>
								</TouchableOpacity>
							) : null,
					}}
				/>

				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#4169E1' />
					</View>
				) : (
					<FlatList
						data={notifications}
						renderItem={renderNotificationItem}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.listContent}
						ListEmptyComponent={renderEmptyState}
						refreshControl={
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
						}
					/>
				)}
			</CustomBackground>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
		marginTop: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	listContent: {
		padding: 16,
		flexGrow: 1,
	},
	notificationItem: {
		flexDirection: "row",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
	},
	unreadNotification: {
		backgroundColor: "#F8F9FF",
	},
	notificationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#F0F3FF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	notificationContent: {
		flex: 1,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 4,
	},
	notificationMessage: {
		fontSize: 14,
		color: "#666",
		marginBottom: 6,
	},
	notificationTime: {
		fontSize: 12,
		color: "#999",
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#4169E1",
		marginLeft: 8,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		marginTop: 100,
	},
	emptyText: {
		fontSize: 16,
		color: "#666",
		marginTop: 12,
		textAlign: "center",
	},
	markAllButton: {
		marginRight: 16,
	},
	markAllText: {
		color: "#fff",
		fontSize: 14,
	},
});
