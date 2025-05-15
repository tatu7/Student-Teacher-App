import React, { createContext, useState, useContext, useEffect } from "react";
import { router } from "expo-router";
import { supabase, AuthUser, UserRole, validateEmail } from "../lib/supabase";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

type AuthContextType = {
	user: AuthUser | null;
	loading: boolean;
	signUp: (
		email: string,
		password: string,
		role: UserRole,
		name?: string
	) => Promise<{ error: any; userCreated?: boolean }>;
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
	// Add a flag to prevent navigation during confirmation flow
	const [preventAutoNavigation, setPreventAutoNavigation] = useState(false);

	// Function to check if we're on an auth screen (safe for React Native)
	const checkIfOnAuthScreen = async (): Promise<boolean> => {
		try {
			// Check if we have the flag set in SecureStore
			const flag = await SecureStore.getItemAsync("preventAutoNavigation");
			if (flag === "true") {
				console.log("Found preventAutoNavigation flag in SecureStore");
				setPreventAutoNavigation(true);
				return true;
			}

			// For now, just use our local state
			return preventAutoNavigation;
		} catch (e) {
			console.error("Error checking navigation prevention flag:", e);
			return false;
		}
	};

	// Check for user session on mount
	useEffect(() => {
		const checkUser = async () => {
			try {
				setLoading(true);

				// Get current session (v1 syntax)
				const session = supabase.auth.session();

				// Check if we're on an auth page
				const isAuthPage = await checkIfOnAuthScreen();
				console.log("isAuthPage:", isAuthPage);

				if (session && session.user) {
					// Check if this is a new signup (email not confirmed yet)
					const newSignup =
						session.user.user_metadata &&
						session.user.user_metadata.confirmation_sent_at &&
						!session.user.email_confirmed_at;

					if (newSignup) {
						// Don't navigate for new signups
						console.log(
							"New signup detected in initial check, skipping navigation"
						);
						setLoading(false);
						return;
					}

					try {
						// Get user's role from profiles table
						const { data, error } = await supabase
							.from("user_profiles")
							.select("role")
							.eq("id", session.user.id)
							.maybeSingle();

						// If no profile, use the role from user metadata and create one
						if (!data) {
							console.log("No profile found, creating new profile");

							// Get the role from metadata
							const userRole =
								session.user.user_metadata?.role || UserRole.STUDENT;

							try {
								// Use upsert to safely create profile, even if it already exists (handles race conditions)
								const { error: profileError } = await supabase
									.from("user_profiles")
									.upsert(
										{
											id: session.user.id,
											email: session.user.email,
											role: userRole,
											display_name: session.user.user_metadata?.name || null,
										},
										{ onConflict: "id" }
									);

								if (profileError) {
									console.error("Error upserting profile:", profileError);
								}

								// Set user in state
								setUser({
									id: session.user.id,
									email: session.user.email || "",
									role: userRole as UserRole,
								});

								// Only navigate if not on auth page and not preventing navigation
								if (!preventAutoNavigation && !isAuthPage) {
									// Navigate based on role
									if (userRole === UserRole.TEACHER) {
										router.replace("/teacher/dashboard");
									} else {
										router.replace("/student/dashboard");
									}
								} else {
									console.log(
										"Skipping navigation due to preventAutoNavigation flag or auth page"
									);
								}
							} catch (profileError) {
								console.error("Error creating profile:", profileError);

								// Still set user state, but don't navigate if on auth page
								setUser({
									id: session.user.id,
									email: session.user.email || "",
									role: userRole as UserRole,
								});

								if (!preventAutoNavigation && !isAuthPage) {
									if (userRole === UserRole.TEACHER) {
										router.replace("/teacher/dashboard");
									} else {
										router.replace("/student/dashboard");
									}
								}
							}
						} else {
							// Profile exists, set user role from profile
							setUser({
								id: session.user.id,
								email: session.user.email || "",
								role: data.role as UserRole,
							});

							// Only navigate if not on auth page and not preventing navigation
							if (!preventAutoNavigation && !isAuthPage) {
								// Navigate based on role
								if (data.role === UserRole.TEACHER) {
									router.replace("/teacher/dashboard");
								} else {
									router.replace("/student/dashboard");
								}
							} else {
								console.log("Skipping navigation on auth page");
							}
						}
					} catch (e) {
						console.error("Error checking user profile:", e);
					}
				}
			} catch (error) {
				console.error("Error checking user:", error);
			} finally {
				setLoading(false);
			}
		};

		checkUser();

		// Listen for auth state changes (v1 syntax)
		const { data: authListener } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				console.log("Auth state change:", event);

				if (event === "SIGNED_OUT") {
					setUser(null);
					router.replace("/auth/login");
				} else if (
					session?.user &&
					(event === "SIGNED_IN" || event === "USER_UPDATED")
				) {
					try {
						// Check if this is a new signup (email not confirmed yet)
						// In v1, metadata includes confirmation_sent_at but not email_confirmed_at for unconfirmed users
						const isNewSignup =
							session.user.user_metadata?.confirmation_sent_at &&
							!session.user.email_confirmed_at;

						// Check if we're on an auth screen
						const isOnAuthScreen = await checkIfOnAuthScreen();

						console.log("Auth state change:", {
							event,
							isNewSignup,
							isOnAuthScreen,
							preventAutoNavigation,
						});

						if (isNewSignup || isOnAuthScreen || preventAutoNavigation) {
							// Don't navigate for new signups or if already on auth screens
							console.log(
								"On auth screen or new signup, skipping auto-navigation"
							);
							return;
						}

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

							// Only navigate if we're not on auth pages
							if (!isOnAuthScreen && !preventAutoNavigation) {
								// Navigate based on role
								if (data[0].role === UserRole.TEACHER) {
									router.replace("/teacher/dashboard");
								} else if (data[0].role === UserRole.STUDENT) {
									router.replace("/student/dashboard");
								}
							}
						} else {
							// Create profile if it doesn't exist
							try {
								// First check if a profile might exist with the same email
								const { data: existingProfileByEmail } = await supabase
									.from("user_profiles")
									.select("id")
									.ilike("email", session.user.email || "")
									.maybeSingle();

								if (existingProfileByEmail) {
									// Update the existing profile
									const { error: updateError } = await supabase
										.from("user_profiles")
										.update({
											id: session.user.id,
											email: session.user.email,
											role: UserRole.STUDENT,
											display_name: session.user.user_metadata?.name || null,
										})
										.eq("id", existingProfileByEmail.id);

									if (updateError) {
										console.error("Error updating profile:", updateError);
									}
								} else {
									// Insert a new profile
									const { error: insertError } = await supabase
										.from("user_profiles")
										.insert({
											id: session.user.id,
											email: session.user.email,
											role: UserRole.STUDENT, // Default role
											display_name: session.user.user_metadata?.name || null,
										});

									if (insertError) {
										console.error("Error creating profile:", insertError);
									}
								}

								// Set user state
								setUser({
									id: session.user.id,
									email: session.user.email!,
									role: UserRole.STUDENT,
								});

								// Only navigate if not on auth pages
								if (!isOnAuthScreen && !preventAutoNavigation) {
									router.replace("/student/dashboard");
								} else {
									console.log("On auth screen, not navigating automatically");
								}
							} catch (error) {
								console.error("Error handling profile creation:", error);
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
	}, [preventAutoNavigation]);

	// Sign up function
	const signUp = async (
		email: string,
		password: string,
		role: UserRole,
		name?: string
	) => {
		try {
			// Set the prevention flag to prevent auto-navigation
			await SecureStore.setItemAsync("preventAutoNavigation", "true");

			// Store the email for confirmation page
			await SecureStore.setItemAsync("pendingConfirmationEmail", email);

			// Email validation for common patterns
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!validateEmail(email)) {
				return {
					error: {
						message: "Email address is invalid or domain is not supported",
					},
				};
			}

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
										display_name: name || null,
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

						// Only redirect if prevention flag is not set
						const preventNav = await SecureStore.getItemAsync(
							"preventAutoNavigation"
						);
						if (preventNav !== "true") {
							if (userRole === UserRole.TEACHER) {
								router.replace("/teacher/dashboard");
							} else {
								router.replace("/student/dashboard");
							}
						} else {
							console.log("Navigation prevented by flag");
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

						// Only redirect if prevention flag is not set
						const preventNav = await SecureStore.getItemAsync(
							"preventAutoNavigation"
						);
						if (preventNav !== "true") {
							if (role === UserRole.TEACHER) {
								router.replace("/teacher/dashboard");
							} else {
								router.replace("/student/dashboard");
							}
						}
					}

					return { error: null };
				}
			}

			// Get the deep link redirect URL for email confirmations
			const redirectUrl = Linking.createURL("auth/confirm", {
				scheme: "studentteacher",
			});
			console.log("Using redirect URL for auth:", redirectUrl);

			// User doesn't exist, create new with email confirmation and redirect URL
			// Force email confirmation with redirectTo
			let signUpError = null;

			try {
				const { user: newUser, error } = await supabase.auth.signUp(
					{
						email,
						password,
					},
					{
						data: {
							role: role,
							name: name, // Store name in user metadata
						},
						redirectTo: redirectUrl,
					}
				);

				if (error) {
					// Don't log errors to console, instead return as a structured response
					// console.error("Signup error:", error);
					return { error };
				}

				if (!newUser) {
					return { error: { message: "Failed to create user" } };
				}

				// Check if account needs confirmation
				const emailConfirmationSent =
					newUser.confirmation_sent_at ||
					(newUser.user_metadata && newUser.user_metadata.confirmation_sent_at);

				// Don't log potentially sensitive user info to console
				// console.log("User created, email confirmation status:", {
				// 	user: newUser.id,
				// 	emailConfirmationSent,
				// 	metadata: newUser.user_metadata
				// });

				// If the user was automatically confirmed (development-only behavior or email confirmation disabled)
				// we shouldn't let them proceed to the dashboard without creating a profile
				if (!emailConfirmationSent) {
					// No confirmation sent, email confirmation might be disabled in Supabase
					console.warn(
						"Email confirmation appears to be disabled in Supabase, still showing verification screen"
					);
				}

				// Explicitly prevent automatic navigation
				await SecureStore.setItemAsync("preventAutoNavigation", "true");

				// In either case, we'll show the verification screen
				return { error: null, userCreated: true };
			} catch (error) {
				// Don't log errors to console
				// console.error("Error during supabase.auth.signUp:", error);

				// Try to parse the error message
				let errorMessage = "Error creating account";
				if (error instanceof Error) {
					errorMessage = error.message;
				} else if (typeof error === "object" && error !== null) {
					// Use any type to access unknown properties
					const errorObj = error as any;
					if (errorObj.message) {
						errorMessage = errorObj.message;
					} else if (errorObj.error_description) {
						errorMessage = errorObj.error_description;
					}
				}

				return { error: { message: errorMessage } };
			}
		} catch (error) {
			console.error("Signup process error:", error);

			let errorMessage = "Signup process failed";
			if (error instanceof Error) {
				errorMessage = error.message;
			}

			return { error: { message: errorMessage } };
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

			if (authUser) {
				// Fetch the user's role
				const { data, error: profileError } = await supabase
					.from("user_profiles")
					.select("role")
					.eq("id", authUser.id)
					.single();

				if (profileError) {
					console.error("Error fetching user profile:", profileError);
					return { error: profileError };
				}

				if (data) {
					// Set user data with role
					setUser({
						id: authUser.id,
						email: authUser.email || "",
						role: data.role as UserRole,
					});

					// Navigate based on role
					if (data.role === UserRole.TEACHER) {
						router.replace("/teacher/dashboard");
					} else {
						router.replace("/student/dashboard");
					}
				}
			}

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
			// Clean and validate email
			const trimmedEmail = email.trim();

			// Check if email has valid format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(trimmedEmail)) {
				return { error: { message: "Invalid email format" } };
			}

			// Use v1 API correctly
			const { error } = await supabase.auth.api.resetPasswordForEmail(
				trimmedEmail
			);
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
