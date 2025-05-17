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
	useWindowDimensions,
} from "react-native";
import { useNotifications } from "../../context/NotificationsContext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import CustomBackground from "@/components/CustomBackground";
import { icons } from "@/constants/icons";

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
	const { width } = useWindowDimensions();
	const isSmallScreen = width < 375;

	const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
		const getIcon = () => {
			const iconSize = isSmallScreen ? 20 : 24;

			switch (item.type) {
				case "task_assigned":
					return (
						<MaterialIcons name='assignment' size={iconSize} color='#4169E1' />
					);
				case "group_invitation":
					return <Ionicons name='people' size={iconSize} color='#4169E1' />;
				default:
					return (
						<Ionicons name='notifications' size={iconSize} color='#4169E1' />
					);
			}
		};

		const getTitle = () => {
			switch (item.type) {
				case "task_assigned":
					return "Yangi vazifa qo'shildi";
				case "group_invitation":
					return "Guruh taklifi";
				default:
					return "Xabar";
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

		const iconContainerSize = isSmallScreen ? 36 : 44;
		const dotSize = isSmallScreen ? 10 : 12;

		return (
			<TouchableOpacity
				style={[
					styles.notificationItem,
					{ backgroundColor: item.is_read ? "white" : "#EEF1FF" },
					isSmallScreen && styles.smallNotificationItem,
				]}
				onPress={() => markAsRead(item.id)}>
				<View
					style={[
						styles.iconContainer,
						{
							width: iconContainerSize,
							height: iconContainerSize,
							borderRadius: iconContainerSize / 2,
						},
					]}>
					{getIcon()}
					{!item.is_read && (
						<View
							style={[
								styles.unreadDot,
								{
									width: dotSize,
									height: dotSize,
									borderRadius: dotSize / 2,
								},
							]}
						/>
					)}
				</View>

				<View style={styles.contentContainer}>
					<View style={styles.headerRow}>
						<Text
							style={[
								styles.notificationTitle,
								isSmallScreen && styles.smallNotificationTitle,
							]}>
							{getTitle()}
						</Text>
						<Text
							style={[styles.timeText, isSmallScreen && styles.smallTimeText]}>
							{getTime()}
						</Text>
					</View>

					<Text
						style={[
							styles.messageText,
							isSmallScreen && styles.smallMessageText,
						]}>
						{item.data?.message || "Sizda yangi xabar bor"}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	const renderEmptyComponent = () => (
		<View style={styles.emptyContainer}>
			<Image
				source={require("../../assets/empty-notification.png")}
				style={[styles.emptyImage, isSmallScreen && styles.smallEmptyImage]}
				onError={() => {}}
			/>
			<Text
				style={[styles.emptyTitle, isSmallScreen && styles.smallEmptyTitle]}>
				Hozircha xabarlar yo'q
			</Text>
			<Text
				style={[
					styles.emptySubtitle,
					isSmallScreen && styles.smallEmptySubtitle,
				]}>
				Bu yerda topshiriqlar va guruhlar haqidagi xabarlarni ko'rasiz
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<CustomBackground image={icons.bg6} overlayColor='rgba(0,0,0,0.4)'>
				<View style={styles.header}>
					<Text
						style={[
							styles.headerTitle,
							isSmallScreen && styles.smallHeaderTitle,
						]}>
						Xabarlar
					</Text>
				</View>

				{unreadCount > 0 && (
					<TouchableOpacity
						style={[
							styles.markAllReadButton,
							isSmallScreen && styles.smallMarkAllReadButton,
						]}
						onPress={() => {
							notifications
								.filter((n) => !n.is_read)
								.forEach((n) => markAsRead(n.id));
						}}>
						<Text
							style={[
								styles.markAllReadText,
								isSmallScreen && styles.smallMarkAllReadText,
							]}>
							Barchasini o'qilgan deb belgilash
						</Text>
					</TouchableOpacity>
				)}

				<FlatList
					data={notifications}
					renderItem={renderNotificationItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={[
						styles.listContainer,
						isSmallScreen && styles.smallListContainer,
					]}
					refreshControl={
						<RefreshControl refreshing={loading} onRefresh={refresh} />
					}
					ListEmptyComponent={!loading ? renderEmptyComponent : null}
				/>

				{loading && notifications.length === 0 && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#4169E1' />
					</View>
				)}
			</CustomBackground>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
	},
	header: {
		backgroundColor: "#4169E1",
		paddingTop: 50,
		paddingBottom: 20,
		paddingHorizontal: 16,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	smallHeaderTitle: {
		fontSize: 20,
	},
	markAllReadButton: {
		alignSelf: "flex-end",
		paddingVertical: 8,
		paddingHorizontal: 16,
		marginTop: 8,
		marginRight: 16,
	},
	smallMarkAllReadButton: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		marginTop: 6,
		marginRight: 12,
	},
	markAllReadText: {
		color: "#4169E1",
		fontWeight: "600",
		fontSize: 14,
	},
	smallMarkAllReadText: {
		fontSize: 12,
	},
	listContainer: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingBottom: 20,
	},
	smallListContainer: {
		paddingHorizontal: 12,
		paddingBottom: 16,
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
	smallNotificationItem: {
		padding: 12,
		borderRadius: 10,
		marginTop: 8,
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
	smallNotificationTitle: {
		fontSize: 14,
	},
	timeText: {
		fontSize: 12,
		color: "#999",
	},
	smallTimeText: {
		fontSize: 10,
	},
	messageText: {
		fontSize: 14,
		color: "#666",
		lineHeight: 20,
	},
	smallMessageText: {
		fontSize: 12,
		lineHeight: 16,
	},
	loadingContainer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.7)",
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 80,
		paddingHorizontal: 32,
	},
	emptyImage: {
		width: 150,
		height: 150,
		marginBottom: 20,
	},
	smallEmptyImage: {
		width: 120,
		height: 120,
		marginBottom: 16,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
	},
	smallEmptyTitle: {
		fontSize: 18,
		marginBottom: 6,
	},
	emptySubtitle: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 22,
	},
	smallEmptySubtitle: {
		fontSize: 14,
		lineHeight: 18,
	},
});
