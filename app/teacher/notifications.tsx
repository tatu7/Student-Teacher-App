import React, { useEffect } from "react";
import {
	StyleSheet,
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Image,
	SafeAreaView,
} from "react-native";
import { useNotifications } from "../../context/NotificationsContext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

type NotificationItem = {
	id: string;
	user_id: string;
	type: string;
	data: {
		message?: string;
		[key: string]: any;
	};
	is_read: boolean;
	created_at: string;
};

export default function NotificationsScreen() {
	const { notifications, loading, markAsRead, refresh, unreadCount } =
		useNotifications();

	const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
		const getIcon = () => {
			switch (item.type) {
				case "submission_received":
					return (
						<MaterialIcons
							name='assignment-turned-in'
							size={24}
							color='#3f51b5'
						/>
					);
				case "group_update":
					return <Ionicons name='people' size={24} color='#3f51b5' />;
				default:
					return <Ionicons name='notifications' size={24} color='#3f51b5' />;
			}
		};

		const getTitle = () => {
			switch (item.type) {
				case "submission_received":
					return "New Submission";
				case "group_update":
					return "Group Update";
				default:
					return "Notification";
			}
		};

		const getTime = () => {
			try {
				return formatDistanceToNow(new Date(item.created_at), {
					addSuffix: true,
				});
			} catch (e) {
				return "";
			}
		};

		return (
			<TouchableOpacity
				style={[
					styles.notificationItem,
					{ backgroundColor: item.is_read ? "white" : "#EEF1FF" },
				]}
				onPress={() => markAsRead(item.id)}>
				<View style={styles.iconContainer}>
					{getIcon()}
					{!item.is_read && <View style={styles.unreadDot} />}
				</View>

				<View style={styles.contentContainer}>
					<View style={styles.headerRow}>
						<Text style={styles.notificationTitle}>{getTitle()}</Text>
						<Text style={styles.timeText}>{getTime()}</Text>
					</View>

					<Text style={styles.messageText}>
						{item.data?.message || "You have a new notification"}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	const renderEmptyComponent = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name='notifications-outline' size={80} color='#ccc' />
			<Text style={styles.emptyTitle}>No notifications yet</Text>
			<Text style={styles.emptySubtitle}>
				You'll see notifications about submissions and groups here
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Notifications</Text>
			</View>

			{unreadCount > 0 && (
				<TouchableOpacity
					style={styles.markAllReadButton}
					onPress={() => {
						notifications
							.filter((n) => !n.is_read)
							.forEach((n) => markAsRead(n.id));
					}}>
					<Text style={styles.markAllReadText}>Mark all as read</Text>
				</TouchableOpacity>
			)}

			<FlatList
				data={notifications}
				renderItem={renderNotificationItem}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContainer}
				refreshControl={
					<RefreshControl refreshing={loading} onRefresh={refresh} />
				}
				ListEmptyComponent={!loading ? renderEmptyComponent : null}
			/>

			{loading && notifications.length === 0 && (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#3f51b5' />
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#333",
	},
	markAllReadButton: {
		alignSelf: "flex-end",
		paddingVertical: 8,
		paddingHorizontal: 16,
		marginTop: 8,
		marginRight: 16,
	},
	markAllReadText: {
		color: "#3f51b5",
		fontWeight: "600",
		fontSize: 14,
	},
	listContainer: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingBottom: 20,
	},
	notificationItem: {
		flexDirection: "row",
		padding: 16,
		borderRadius: 12,
		marginTop: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	iconContainer: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#EEF1FE",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	unreadDot: {
		position: "absolute",
		right: 0,
		top: 0,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "#f44336",
		borderWidth: 2,
		borderColor: "white",
	},
	contentContainer: {
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	timeText: {
		fontSize: 12,
		color: "#999",
	},
	messageText: {
		fontSize: 14,
		color: "#666",
		lineHeight: 20,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 40,
		paddingBottom: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#999",
		textAlign: "center",
		marginTop: 8,
	},
	emptyImage: {
		width: 120,
		height: 120,
		resizeMode: "contain",
		marginBottom: 16,
	},
	loadingContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
	},
});
