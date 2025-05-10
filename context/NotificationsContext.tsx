import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { AppState, AppStateStatus } from "react-native";

type Notification = {
	id: string;
	user_id: string;
	type:
		| "task_assigned"
		| "task_submitted"
		| "rating_updated"
		| "group_invitation";
	data: any;
	is_read: boolean;
	created_at: string;
};

type NotificationsContextType = {
	notifications: Notification[];
	unreadCount: number;
	markAsRead: (notificationId: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined);

const POLLING_INTERVAL = 30000; // Poll every 30 seconds

export function NotificationsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);
	const [isPolling, setIsPolling] = useState(true);

	const fetchNotifications = useCallback(async () => {
		if (!user || !isPolling) return;

		try {
			const query = supabase
				.from("notifications")
				.select("*")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });

			// If we have a last fetched ID, only get newer notifications
			if (lastFetchedId) {
				query.gt("id", lastFetchedId);
			}

			const { data, error } = await query;

			if (error) {
				console.error("Error fetching notifications:", error);
				return;
			}

			if (data && data.length > 0) {
				// Update last fetched ID
				setLastFetchedId(data[0].id);

				// If this is the initial fetch, replace all notifications
				if (!lastFetchedId) {
					setNotifications(data);
				} else {
					// Otherwise, add new notifications to the beginning
					setNotifications((prev) => [...data, ...prev]);
				}

				// Update unread count
				const newUnreadCount = data.filter((n) => !n.is_read).length;
				if (newUnreadCount > 0) {
					setUnreadCount((prev) => prev + newUnreadCount);
				}
			}
		} catch (error) {
			console.error("Error in fetchNotifications:", error);
		}
	}, [user, lastFetchedId, isPolling]);

	useEffect(() => {
		if (!user) return;

		// Initial fetch
		fetchNotifications();

		// Set up polling
		const intervalId = setInterval(fetchNotifications, POLLING_INTERVAL);

		// Handle app state changes
		const subscription = AppState.addEventListener(
			"change",
			(nextAppState: AppStateStatus) => {
				setIsPolling(nextAppState === "active");
				if (nextAppState === "active") {
					fetchNotifications(); // Fetch immediately when app becomes active
				}
			}
		);

		return () => {
			clearInterval(intervalId);
			subscription.remove();
		};
	}, [user, fetchNotifications]);

	const markAsRead = async (notificationId: string) => {
		if (!user) return;

		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", notificationId)
				.eq("user_id", user.id);

			if (error) {
				console.error("Error marking notification as read:", error);
				return;
			}

			setNotifications((prev) =>
				prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
			);
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch (error) {
			console.error("Error in markAsRead:", error);
		}
	};

	const markAllAsRead = async () => {
		if (!user) return;

		try {
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("user_id", user.id)
				.eq("is_read", false);

			if (error) {
				console.error("Error marking all notifications as read:", error);
				return;
			}

			setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
			setUnreadCount(0);
		} catch (error) {
			console.error("Error in markAllAsRead:", error);
		}
	};

	return (
		<NotificationsContext.Provider
			value={{
				notifications,
				unreadCount,
				markAsRead,
				markAllAsRead,
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
