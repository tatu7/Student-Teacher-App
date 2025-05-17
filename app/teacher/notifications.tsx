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
import { icons } from "@/constants/icons";
import CustomBackground from "@/components/CustomBackground";

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
	const isVerySmallScreen = width < 320;

	const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
		const getIcon = () => {
			const iconSize = isSmallScreen ? 20 : 24;

			switch (item.type) {
				case "submission_received":
					return (
						<MaterialIcons
							name='assignment-turned-in'
							size={iconSize}
							color='#4169E1'
						/>
					);
				case "group_update":
					return <Ionicons name='people' size={iconSize} color='#4169E1' />;
				default:
					return (
						<Ionicons name='notifications' size={iconSize} color='#4169E1' />
					);
			}
		};

		const getTitle = () => {
			switch (item.type) {
				case "submission_received":
					return "Yangi Topshiriq";
				case "group_update":
					return "Guruh Yangilanishi";
				default:
					return "Xabarnoma";
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
					{ backgroundColor: item.is_read ? "white" : "#EEF6FF" },
					isSmallScreen && styles.notificationItemSmall,
				]}
				onPress={() => markAsRead(item.id)}>
				<View
					style={[
						styles.iconContainer,
						isSmallScreen && styles.iconContainerSmall,
					]}>
					{getIcon()}
					{!item.is_read && (
						<View
							style={[styles.unreadDot, isSmallScreen && styles.unreadDotSmall]}
						/>
					)}
				</View>

				<View style={styles.contentContainer}>
					<View style={styles.headerRow}>
						<Text
							style={[
								styles.notificationTitle,
								isSmallScreen && styles.notificationTitleSmall,
							]}>
							{getTitle()}
						</Text>
						<Text
							style={[styles.timeText, isSmallScreen && styles.timeTextSmall]}>
							{getTime()}
						</Text>
					</View>

					<Text
						style={[
							styles.messageText,
							isSmallScreen && styles.messageTextSmall,
						]}>
						{item.data?.message || "Sizda yangi xabarnoma mavjud"}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	const renderEmptyComponent = () => (
		<View style={styles.emptyContainer}>
			<Ionicons
				name='notifications-outline'
				size={isSmallScreen ? 60 : 80}
				color='#D0D7F0'
			/>
			<Text
				style={[styles.emptyTitle, isSmallScreen && styles.emptyTitleSmall]}>
				Xabarnomalar yo'q
			</Text>
			<Text
				style={[
					styles.emptySubtitle,
					isSmallScreen && styles.emptySubtitleSmall,
				]}>
				Bu yerda topshiriqlar va guruhlar haqidagi xabarlarni ko'rasiz
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<CustomBackground image={icons.bg6}>
				<View style={[styles.header, isSmallScreen && styles.headerSmall]}>
					<Text
						style={[
							styles.headerTitle,
							isSmallScreen && styles.headerTitleSmall,
						]}>
						Xabarnomalar
					</Text>
				</View>

				{unreadCount > 0 && (
					<TouchableOpacity
						style={[
							styles.markAllReadButton,
							isSmallScreen && styles.markAllReadButtonSmall,
						]}
						onPress={() => {
							notifications
								.filter((n) => !n.is_read)
								.forEach((n) => markAsRead(n.id));
						}}>
						<Text
							style={[
								styles.markAllReadText,
								isSmallScreen && styles.markAllReadTextSmall,
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
						isSmallScreen && styles.listContainerSmall,
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
		paddingHorizontal: 20,
	},
	headerSmall: {
		paddingTop: 40,
		paddingBottom: 16,
		paddingHorizontal: 16,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "white",
	},
	headerTitleSmall: {
		fontSize: 20,
	},
	markAllReadButton: {
		alignSelf: "flex-end",
		paddingVertical: 10,
		paddingHorizontal: 16,
		marginTop: 16,
		marginRight: 16,
		backgroundColor: "#EEF6FF",
		borderRadius: 8,
	},
	markAllReadButtonSmall: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginTop: 12,
		marginRight: 12,
		borderRadius: 6,
	},
	markAllReadText: {
		color: "#4169E1",
		fontWeight: "600",
		fontSize: 14,
	},
	markAllReadTextSmall: {
		fontSize: 12,
	},
	listContainer: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	listContainerSmall: {
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	notificationItem: {
		flexDirection: "row",
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	notificationItemSmall: {
		padding: 12,
		borderRadius: 12,
		marginBottom: 10,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#EEF6FF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	iconContainerSmall: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},
	unreadDot: {
		position: "absolute",
		right: 0,
		top: 0,
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#FF5252",
		borderWidth: 2,
		borderColor: "white",
	},
	unreadDotSmall: {
		width: 8,
		height: 8,
		borderRadius: 4,
		borderWidth: 1.5,
	},
	contentContainer: {
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	notificationTitleSmall: {
		fontSize: 14,
	},
	timeText: {
		fontSize: 12,
		color: "#999",
	},
	timeTextSmall: {
		fontSize: 10,
	},
	messageText: {
		fontSize: 14,
		color: "#666",
		lineHeight: 20,
	},
	messageTextSmall: {
		fontSize: 12,
		lineHeight: 18,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 40,
		paddingBottom: 40,
		marginTop: 60,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
		marginTop: 16,
	},
	emptyTitleSmall: {
		fontSize: 16,
		marginTop: 12,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#000",
		textAlign: "center",
		marginTop: 8,
	},
	emptySubtitleSmall: {
		fontSize: 12,
		marginTop: 6,
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
