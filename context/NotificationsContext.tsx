import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

type Notification = {
	id: string;
	user_id: string;
	type: string;
	data: any;
	is_read: boolean;
	created_at: string;
};

type NotificationsContextType = {
	notifications: Notification[];
	loading: boolean;
	unreadCount: number;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	refresh: () => Promise<void>;
};

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined);

// Configure Expo Notifications
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: false,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

export function NotificationsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
	const [appState, setAppState] = useState<AppStateStatus>(
		AppState.currentState
	);

	// Register for push notifications (optional for app badge to work on some devices)
	const registerForPushNotificationsAsync = async () => {
		// We only need this for actual devices, not for simulators
		if (!Device.isDevice) return;

		try {
			const { status: existingStatus } =
				await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;

			// Only ask for permission if not already granted
			if (existingStatus !== "granted") {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}

			if (finalStatus !== "granted") {
				console.log("Failed to get push token for push notification!");
				return;
			}

			// Success - just get permissions, we don't need the token
			console.log("Push notifications permission granted");
		} catch (error) {
			console.error("Error registering for push notifications:", error);
		}
	};

	// Update app badge count
	const updateAppBadge = useCallback((count: number) => {
		try {
			// This works on both iOS and Android
			Notifications.setBadgeCountAsync(count);
		} catch (error) {
			console.error("Error setting badge count:", error);
		}
	}, []);

	// Fetch notifications with better error handling
	const fetchNotifications = useCallback(async () => {
		if (!user) return;

		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("notifications")
				.select("*")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching notifications:", error);
				return;
			}

			if (data) {
				setNotifications(data);
				const newUnreadCount = data.filter((note) => !note.is_read).length;
				setUnreadCount(newUnreadCount);

				// Update app badge with the unread count
				updateAppBadge(newUnreadCount);

				setLastCheckTime(new Date());
			}
		} catch (error) {
			console.error("Exception in fetchNotifications:", error);
		} finally {
			setLoading(false);
		}
	}, [user, updateAppBadge]);

	// Public refresh function
	const refresh = async () => {
		await fetchNotifications();
	};

	// Mark notification as read
	const markAsRead = async (id: string) => {
		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", id);

			if (error) {
				console.error("Error marking notification as read:", error);
				return;
			}

			// Update local state
			setNotifications(
				notifications.map((note) =>
					note.id === id ? { ...note, is_read: true } : note
				)
			);

			// Update unread count and badge
			const newUnreadCount = Math.max(0, unreadCount - 1);
			setUnreadCount(newUnreadCount);
			updateAppBadge(newUnreadCount);
		} catch (error) {
			console.error("Exception in markAsRead:", error);
		}
	};

	// Mark all notifications as read
	const markAllAsRead = async () => {
		if (notifications.length === 0) return;

		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("user_id", user?.id);

			if (error) {
				console.error("Error marking all notifications as read:", error);
				return;
			}

			// Update local state
			setNotifications(
				notifications.map((note) => ({ ...note, is_read: true }))
			);

			// Update unread count and badge
			setUnreadCount(0);
			updateAppBadge(0);
		} catch (error) {
			console.error("Exception in markAllAsRead:", error);
		}
	};

	// Register for push notifications when component mounts
	useEffect(() => {
		registerForPushNotificationsAsync();
	}, []);

	// Effect for app state changes
	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextAppState) => {
			if (appState !== "active" && nextAppState === "active") {
				// App became active, fetch notifications immediately
				fetchNotifications();
			} else if (
				appState === "active" &&
				nextAppState.match(/inactive|background/)
			) {
				// App is going to background - ensure badge is updated
				updateAppBadge(unreadCount);
			}
			setAppState(nextAppState);
		});

		return () => {
			subscription.remove();
		};
	}, [appState, fetchNotifications, unreadCount, updateAppBadge]);

	// Initial fetch and polling
	useEffect(() => {
		if (!user) return;

		// Fetch immediately on mount or user change
		fetchNotifications();

		// Set up polling (only when app is active)
		const interval = setInterval(() => {
			if (appState === "active") {
				fetchNotifications();
			}
		}, 30000); // Check every 30 seconds

		return () => clearInterval(interval);
	}, [user, fetchNotifications, appState]);

	return (
		<NotificationsContext.Provider
			value={{
				notifications,
				loading,
				unreadCount,
				markAsRead,
				markAllAsRead,
				refresh,
			}}>
			{children}
		</NotificationsContext.Provider>
	);
}

export function useNotifications() {
	const context = useContext(NotificationsContext);

	if (context === undefined) {
		throw new Error(
			"useNotifications must be used within a NotificationsProvider"
		);
	}

	return context;
}
