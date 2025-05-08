import React, { createContext, useState, useContext, useEffect } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

// User types
export enum UserRole {
	TEACHER = "teacher",
	STUDENT = "student",
}

export type User = {
	id: string;
	email: string;
	role: UserRole;
};

// Mock users for local development (replace with real API calls in production)
const MOCK_USERS = [
	{
		email: "teacher@example.com",
		password: "password123",
		role: UserRole.TEACHER,
	},
	{
		email: "student@example.com",
		password: "password123",
		role: UserRole.STUDENT,
	},
];

type AuthContextType = {
	user: User | null;
	loading: boolean;
	signUp: (
		email: string,
		password: string,
		role: UserRole
	) => Promise<{ error: any }>;
	signIn: (email: string, password: string) => Promise<{ error: any }>;
	signOut: () => Promise<void>;
	setUserRole: (role: UserRole) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const storeUser = async (user: User) => {
	await SecureStore.setItemAsync("user", JSON.stringify(user));
};

const getStoredUser = async (): Promise<User | null> => {
	const userData = await SecureStore.getItemAsync("user");
	return userData ? JSON.parse(userData) : null;
};

// Provider component that wraps your app and makes auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Check for stored session on mount
	useEffect(() => {
		const checkUser = async () => {
			try {
				setLoading(true);
				const storedUser = await getStoredUser();

				if (storedUser) {
					setUser(storedUser);

					// Redirect to the appropriate dashboard based on role
					if (storedUser.role === UserRole.TEACHER) {
						router.replace("/teacher/dashboard");
					} else if (storedUser.role === UserRole.STUDENT) {
						router.replace("/student/dashboard");
					}
				}
			} catch (error) {
				console.error("Error checking authentication state:", error);
			} finally {
				setLoading(false);
			}
		};

		checkUser();
	}, []);

	// Sign up function (using mock data for demonstration)
	const signUp = async (email: string, password: string, role: UserRole) => {
		try {
			// Check if user with this email already exists
			const existingUser = MOCK_USERS.find((user) => user.email === email);
			if (existingUser) {
				return { error: { message: "User with this email already exists" } };
			}

			// In a real app, you would make an API call to register user
			// For demo, we'll create a mock user
			const newUser: User = {
				id: Math.random().toString(36).substring(2, 15),
				email,
				role,
			};

			// For demo purposes, add to mock users array
			MOCK_USERS.push({ email, password, role });

			// Store user in secure storage
			await storeUser(newUser);

			// Update state
			setUser(newUser);

			// Navigate based on role
			if (role === UserRole.TEACHER) {
				router.replace("/teacher/dashboard");
			} else {
				router.replace("/student/dashboard");
			}

			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	// Sign in function
	const signIn = async (email: string, password: string) => {
		try {
			// In a real app, make an API call to authenticate
			// For demo, check against mock users
			const matchedUser = MOCK_USERS.find(
				(user) => user.email === email && user.password === password
			);

			if (!matchedUser) {
				return { error: { message: "Invalid email or password" } };
			}

			// Create user object
			const authUser: User = {
				id: Math.random().toString(36).substring(2, 15),
				email: matchedUser.email,
				role: matchedUser.role,
			};

			// Store in secure storage
			await storeUser(authUser);

			// Update state
			setUser(authUser);

			// Navigate based on role
			if (authUser.role === UserRole.TEACHER) {
				router.replace("/teacher/dashboard");
			} else {
				router.replace("/student/dashboard");
			}

			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	// Sign out function
	const signOut = async () => {
		// Clear secure storage
		await SecureStore.deleteItemAsync("user");
		// Update state
		setUser(null);
		// Navigate to login
		router.replace("/auth/login");
	};

	// Update user role
	const setUserRole = async (role: UserRole) => {
		if (!user) return { error: new Error("No user logged in") };

		try {
			const updatedUser = { ...user, role };

			// Update secure storage
			await storeUser(updatedUser);

			// Update state
			setUser(updatedUser);

			// Navigate based on new role
			if (role === UserRole.TEACHER) {
				router.replace("/teacher/dashboard");
			} else {
				router.replace("/student/dashboard");
			}

			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	const value = {
		user,
		loading,
		signUp,
		signIn,
		signOut,
		setUserRole,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for components to get auth context
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
