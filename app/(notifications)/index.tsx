import React from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from "react-native";
import { useNotifications } from "../../context/NotificationsContext";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

export default function NotificationsScreen() {
	const { notifications, markAsRead, markAllAsRead } = useNotifications();
	const { colors } = useTheme();

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "task_assigned":
				return "document-text-outline";
			case "task_submitted":
				return "checkmark-circle-outline";
			case "rating_updated":
				return "star-outline";
			case "group_invitation":
				return "people-outline";
			default:
				return "notifications-outline";
		}
	};

	const getNotificationTitle = (type: string) => {
		switch (type) {
			case "task_assigned":
				return "New Task Assigned";
			case "task_submitted":
				return "Task Submission Received";
			case "rating_updated":
				return "Rating Updated";
			case "group_invitation":
				return "Group Invitation";
			default:
				return "Notification";
		}
	};

	const renderNotification = ({ item }: { item: any }) => (
		<TouchableOpacity
			style={[
				styles.notificationItem,
				{ backgroundColor: item.is_read ? colors.card : colors.background },
			]}
			onPress={() => !item.is_read && markAsRead(item.id)}>
			<View style={styles.iconContainer}>
				<Ionicons
					name={getNotificationIcon(item.type)}
					size={24}
					color={colors.primary}
				/>
			</View>
			<View style={styles.contentContainer}>
				<Text style={[styles.title, { color: colors.text }]}>
					{getNotificationTitle(item.type)}
				</Text>
				<Text style={[styles.message, { color: colors.text }]}>
					{item.data?.message || "New notification"}
				</Text>
				<Text style={[styles.time, { color: colors.text }]}>
					{format(new Date(item.created_at), "MMM d, h:mm a")}
				</Text>
			</View>
			{!item.is_read && (
				<View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
			)}
		</TouchableOpacity>
	);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{notifications.length > 0 && (
				<TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
					<Text style={[styles.markAllText, { color: colors.primary }]}>
						Mark all as read
					</Text>
				</TouchableOpacity>
			)}
			<FlatList
				data={notifications}
				renderItem={renderNotification}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContainer}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Ionicons
							name='notifications-off-outline'
							size={48}
							color={colors.text}
						/>
						<Text style={[styles.emptyText, { color: colors.text }]}>
							No notifications yet
						</Text>
					</View>
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContainer: {
		padding: 16,
	},
	notificationItem: {
		flexDirection: "row",
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	iconContainer: {
		marginRight: 12,
	},
	contentContainer: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	message: {
		fontSize: 14,
		marginBottom: 4,
	},
	time: {
		fontSize: 12,
		opacity: 0.7,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: 8,
		alignSelf: "center",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 32,
	},
	emptyText: {
		marginTop: 16,
		fontSize: 16,
		opacity: 0.7,
	},
	markAllButton: {
		padding: 16,
		alignItems: "flex-end",
	},
	markAllText: {
		fontSize: 14,
		fontWeight: "500",
	},
});
