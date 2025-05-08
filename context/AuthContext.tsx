import React, { createContext, useState, useContext, useEffect } from "react";
import { router } from "expo-router";
import { supabase, AuthUser, UserRole } from "../lib/supabase";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

type AuthContextType = {
	user: AuthUser | null;
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

// Provider component that wraps your app and makes auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	// Check for user session on mount
	useEffect(() => {
		const checkUser = async () => {
			try {
				setLoading(true);

				// Get current session (v1 syntax)
				const session = supabase.auth.session();

				if (session && session.user) {
					// Get user's role from a Supabase table
					const { data, error } = await supabase
						.from("user_profiles")
						.select("role")
						.eq("user_id", session.user.id)
						.single();

					if (error) throw error;

					setUser({
						id: session.user.id,
						email: session.user.email!,
						role: data.role as UserRole,
					});

					// Redirect to the appropriate dashboard based on role
					if (data.role === UserRole.TEACHER) {
						router.replace("/teacher/dashboard");
					} else if (data.role === UserRole.STUDENT) {
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

		// Listen for auth state changes (v1 syntax)
		const authListener = supabase.auth.onAuthStateChange(
			async (event, session) => {
				if (event === "SIGNED_OUT") {
					setUser(null);
					router.replace("/auth/login");
				} else if (
					session &&
					session.user &&
					(event === "SIGNED_IN" || event === "USER_UPDATED")
				) {
					// Fetch user role
					const { data, error } = await supabase
						.from("user_profiles")
						.select("role")
						.eq("user_id", session.user.id)
						.single();

					if (!error && data) {
						setUser({
							id: session.user.id,
							email: session.user.email!,
							role: data.role as UserRole,
						});

						// Navigate based on role
						if (data.role === UserRole.TEACHER) {
							router.replace("/teacher/dashboard");
						} else if (data.role === UserRole.STUDENT) {
							router.replace("/student/dashboard");
						}
					}
				}
			}
		);

		return () => {
			// v1 cleanup is different
			supabase.removeAllSubscriptions();
		};
	}, []);

	// Sign up function (v1 syntax)
	const signUp = async (email: string, password: string, role: UserRole) => {
		try {
			// Register user with Supabase Auth (old version syntax)
			const { user: newUser, error } = await supabase.auth.signUp(
				{
					email,
					password,
				},
				{
					data: { role }, // Store role in user metadata
				}
			);

			if (error) return { error };

			if (newUser) {
				// For v1, we need to disable email confirmation through Supabase dashboard settings

				// Add user's role to a separate table - use the auth.uid() function to ensure RLS works
				const { error: profileError } = await supabase
					.from("user_profiles")
					.insert({
						id: newUser.id, // Use the same ID from the auth.users table
						user_id: newUser.id,
						email,
						role,
						created_at: new Date().toISOString(),
					})
					.match({ user_id: newUser.id }); // Add match filter to help with RLS

				if (profileError) return { error: profileError };

				// Auto sign in after successful registration to bypass email confirmation
				const { error: signInError } = await supabase.auth.signIn({
					email,
					password,
				});

				if (signInError) return { error: signInError };

				// Set user state
				setUser({
					id: newUser.id,
					email,
					role,
				});

				// Navigate based on role
				if (role === UserRole.TEACHER) {
					router.replace("/teacher/dashboard");
				} else {
					router.replace("/student/dashboard");
				}
			}

			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	// Sign in function (v1 syntax)
	const signIn = async (email: string, password: string) => {
		try {
			const { error, user } = await supabase.auth.signIn({
				email,
				password,
			});

			if (error) return { error };

			// User role is fetched by the auth state change listener
			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	// Sign out function (v1 syntax)
	const signOut = async () => {
		await supabase.auth.signOut();
		setUser(null);
		router.replace("/auth/login");
	};

	// Update user role
	const setUserRole = async (role: UserRole) => {
		if (!user) return { error: new Error("No user logged in") };

		try {
			// Update the role in the database
			const { error } = await supabase
				.from("user_profiles")
				.update({ role })
				.eq("user_id", user.id);

			if (error) return { error };

			// Update local state
			setUser({ ...user, role });

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
