import React, { createContext, useState, useContext, useEffect } from "react";
import { router } from "expo-router";
import { supabase, AuthUser, UserRole } from "../lib/supabase";

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
	resetPassword: (email: string) => Promise<{ error: any }>;
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
					try {
						// Get user's role from profiles table
						const { data, error } = await supabase
							.from("user_profiles")
							.select("role")
							.eq("id", session.user.id);

						if (error) throw error;

						// Check if profile exists
						if (data && data.length > 0) {
							setUser({
								id: session.user.id,
								email: session.user.email!,
								role: data[0].role as UserRole,
							});

							// Redirect based on role
							if (data[0].role === UserRole.TEACHER) {
								router.replace("/teacher/dashboard");
							} else if (data[0].role === UserRole.STUDENT) {
								router.replace("/student/dashboard");
							}
						} else {
							// Profile doesn't exist, create it
							console.log("No profile found, creating new profile");
							const { error: insertError } = await supabase
								.from("user_profiles")
								.insert({
									id: session.user.id,
									email: session.user.email,
									role: UserRole.STUDENT, // Default role
								});

							if (insertError) {
								console.error("Error creating profile:", insertError);
							} else {
								setUser({
									id: session.user.id,
									email: session.user.email!,
									role: UserRole.STUDENT,
								});
								router.replace("/student/dashboard");
							}
						}
					} catch (profileError) {
						console.error("Error fetching user profile:", profileError);
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
		const { data: authListener } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				if (event === "SIGNED_OUT") {
					setUser(null);
					router.replace("/auth/login");
				} else if (
					session?.user &&
					(event === "SIGNED_IN" || event === "USER_UPDATED")
				) {
					try {
						// Fetch user role
						const { data, error } = await supabase
							.from("user_profiles")
							.select("role")
							.eq("id", session.user.id);

						if (error) throw error;

						if (data && data.length > 0) {
							setUser({
								id: session.user.id,
								email: session.user.email!,
								role: data[0].role as UserRole,
							});

							// Navigate based on role
							if (data[0].role === UserRole.TEACHER) {
								router.replace("/teacher/dashboard");
							} else if (data[0].role === UserRole.STUDENT) {
								router.replace("/student/dashboard");
							}
						} else {
							// Create profile if it doesn't exist
							const { error: insertError } = await supabase
								.from("user_profiles")
								.insert({
									id: session.user.id,
									email: session.user.email,
									role: UserRole.STUDENT, // Default role
								});

							if (insertError) {
								console.error("Error creating profile:", insertError);
							} else {
								setUser({
									id: session.user.id,
									email: session.user.email!,
									role: UserRole.STUDENT,
								});
								router.replace("/student/dashboard");
							}
						}
					} catch (profileError) {
						console.error("Error handling auth change:", profileError);
					}
				}
			}
		);

		return () => {
			authListener?.unsubscribe();
		};
	}, []);

	// Sign up function
	const signUp = async (email: string, password: string, role: UserRole) => {
		try {
			// First check if user already exists in auth system by trying to log in
			const { error: signInError } = await supabase.auth.signIn({
				email,
				password,
			});

			if (!signInError) {
				console.log("User already exists, proceeding to login flow");

				// User exists and password is correct, just sign them in
				const session = await supabase.auth.session();

				if (session && session.user) {
					// Get or create profile silently - errors here are ignored
					try {
						// Get existing profile
						const { data } = await supabase
							.from("user_profiles")
							.select("role")
							.eq("id", session.user.id);

						let userRole = role; // Default to passed role

						// If profile exists, use its role
						if (data && data.length > 0) {
							userRole = data[0].role as UserRole;
						} else {
							// Silently try to create profile, ignore any errors
							try {
								await supabase.from("user_profiles").upsert(
									{
										id: session.user.id,
										email,
										role,
									},
									{ onConflict: "id" }
								);
							} catch (e) {
								// Completely ignore any errors in profile creation
								console.log("Ignoring profile creation error:", e);
							}
						}

						// Set user and redirect regardless of profile creation result
						setUser({
							id: session.user.id,
							email,
							role: userRole,
						});

						if (userRole === UserRole.TEACHER) {
							router.replace("/teacher/dashboard");
						} else {
							router.replace("/student/dashboard");
						}
					} catch (e) {
						// Ignore any errors in profile flow
						console.log("Ignoring profile retrieval error:", e);

						// Just set basic user and redirect
						setUser({
							id: session.user.id,
							email,
							role,
						});

						if (role === UserRole.TEACHER) {
							router.replace("/teacher/dashboard");
						} else {
							router.replace("/student/dashboard");
						}
					}

					return { error: null };
				}
			}

			// User doesn't exist, create new
			const { user: newUser, error } = await supabase.auth.signUp({
				email,
				password,
			});

			if (error) return { error };

			if (newUser) {
				// Set user regardless of profile creation success
				setUser({
					id: newUser.id,
					email,
					role,
				});

				// Try to create profile but don't fail if it errors
				try {
					await supabase.from("user_profiles").upsert(
						{
							id: newUser.id,
							email,
							role,
						},
						{ onConflict: "id" }
					);
				} catch (e) {
					// Completely ignore profile errors
					console.log("Ignoring profile creation error for new user:", e);
				}

				// Always redirect regardless of profile creation
				if (role === UserRole.TEACHER) {
					router.replace("/teacher/dashboard");
				} else {
					router.replace("/student/dashboard");
				}
			}

			return { error: null };
		} catch (error) {
			console.error("Signup process error:", error);
			return { error };
		}
	};

	// Sign in function
	const signIn = async (email: string, password: string) => {
		try {
			// v1 syntax
			const { error, user: authUser } = await supabase.auth.signIn({
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

	// Sign out function
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
				.eq("id", user.id);

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

	// Reset password function (v1 syntax)
	const resetPassword = async (email: string) => {
		try {
			const { error } = await supabase.auth.api.resetPasswordForEmail(email);
			return { error };
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
		resetPassword,
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
