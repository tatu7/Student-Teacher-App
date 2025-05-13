import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	TouchableOpacity,
	Image,
	SafeAreaView,
	Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import * as SecureStore from "expo-secure-store";

export default function ConfirmEmailScreen() {
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState(false);
	const params = useLocalSearchParams();
	const { signIn } = useAuth();

	// Set flag to prevent auto-navigation on mount
	useEffect(() => {
		SecureStore.setItemAsync("preventAutoNavigation", "true").catch((err) =>
			console.error("Error setting navigation flag:", err)
		);

		// Clean up on unmount only if going to login screen
		return () => {
			if (success) {
				SecureStore.deleteItemAsync("preventAutoNavigation").catch((err) =>
					console.error("Error removing navigation flag:", err)
				);
				SecureStore.deleteItemAsync("pendingConfirmationEmail").catch((err) =>
					console.error("Error removing pending email:", err)
				);
			}
		};
	}, [success]);

	// If coming from outside the app (like an email link), get the stored email
	useEffect(() => {
		if (!params.email) {
			SecureStore.getItemAsync("pendingConfirmationEmail")
				.then((storedEmail) => {
					if (storedEmail) {
						console.log("Found stored email for confirmation:", storedEmail);
					}
				})
				.catch((err) => console.error("Error retrieving stored email:", err));
		}
	}, [params.email]);

	useEffect(() => {
		async function confirmEmail() {
			try {
				setLoading(true);

				// Get access token from URL params
				const accessToken = params.access_token;
				const refreshToken = params.refresh_token;
				const email = params.email as string;
				const type = params.type as string;

				console.log("Confirm params:", {
					type,
					email,
					hasAccessToken: !!accessToken,
				});

				if (!accessToken) {
					setMessage("Invalid confirmation link. Please try signing up again.");
					setSuccess(false);
					return;
				}

				// Set the session with the tokens
				const { error } = await supabase.auth.setSession({
					access_token: accessToken as string,
					refresh_token: refreshToken as string,
				});

				if (error) {
					console.error("Failed to confirm email:", error.message);
					setMessage("Failed to confirm your email. Please try again later.");
					setSuccess(false);
					return;
				}

				// Get the current session to ensure we have the user data
				const session = supabase.auth.session();
				console.log("Session after confirmation:", {
					user: session?.user?.id,
					email: session?.user?.email,
				});

				// Add a delay to allow confirmation to process
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Try to create profile if needed, but don't navigate afterward
				if (session?.user) {
					try {
						// Check if profile exists
						const { data: existingProfile } = await supabase
							.from("user_profiles")
							.select("id")
							.eq("id", session.user.id)
							.maybeSingle();

						if (!existingProfile) {
							// Get role from metadata
							const userRole = session.user.user_metadata?.role || "STUDENT";
							console.log("Creating profile with role:", userRole);

							// Use upsert with onConflict to handle duplicate key
							const { error: profileError } = await supabase
								.from("user_profiles")
								.upsert(
									{
										id: session.user.id,
										email: session.user.email,
										role: userRole,
										created_at: new Date().toISOString(),
									},
									{ onConflict: "id" }
								);

							if (profileError) {
								console.error("Error creating profile:", profileError);
								// Continue anyway, don't show error to user
							}
						}
					} catch (profileError) {
						console.error("Error checking/creating profile:", profileError);
						// Continue anyway, don't show error to user
					}
				}

				setMessage("Your email has been confirmed successfully!");
				setSuccess(true);

				// Manually sign out to prevent auto-navigation
				// This ensures the user must explicitly click "Go to Login"
				await supabase.auth.signOut();
			} catch (error) {
				console.error("Error during confirmation:", error);
				setMessage("An unexpected error occurred. Please try again later.");
				setSuccess(false);
			} finally {
				setLoading(false);
			}
		}

		confirmEmail();
	}, [params]);

	const goToLogin = async () => {
		try {
			// Clean up the prevention flag when manually navigating to login
			await SecureStore.deleteItemAsync("preventAutoNavigation");

			// If we have the email in params or stored, try to auto-login the user
			const paramEmail = params.email as string;
			const storedEmail = await SecureStore.getItemAsync(
				"pendingConfirmationEmail"
			);
			const email = paramEmail || storedEmail;

			if (email && success) {
				// Prompt user for password and try to sign in
				Alert.prompt(
					"Enter Password",
					"Please enter your password to complete the login",
					[
						{
							text: "Cancel",
							onPress: () => router.replace("/auth/login"),
							style: "cancel",
						},
						{
							text: "Login",
							onPress: async (password) => {
								if (password) {
									try {
										setLoading(true);
										const { error } = await signIn(email, password);
										if (error) {
											Alert.alert("Login Failed", error.message);
											router.replace("/auth/login");
										}
									} catch (e) {
										Alert.alert("Error", "Login failed, please try again");
										router.replace("/auth/login");
									} finally {
										setLoading(false);
									}
								} else {
									router.replace("/auth/login");
								}
							},
						},
					],
					"secure-text"
				);
			} else {
				router.replace("/auth/login");
			}
		} catch (e) {
			console.error("Error during login navigation:", e);
			router.replace("/auth/login");
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{ title: "Email Confirmation", headerShown: true }}
			/>

			<View style={styles.content}>
				<Image
					source={require("../../assets/images/logo.png")}
					style={styles.logo}
					resizeMode='contain'
				/>

				<Text style={styles.title}>Email Confirmation</Text>

				{loading ? (
					<ActivityIndicator size='large' color='#3f51b5' />
				) : (
					<>
						<View
							style={[
								styles.messageContainer,
								success ? styles.successContainer : styles.errorContainer,
							]}>
							<Text style={styles.message}>{message}</Text>
						</View>

						<TouchableOpacity style={styles.button} onPress={goToLogin}>
							<Text style={styles.buttonText}>Go to Login</Text>
						</TouchableOpacity>
					</>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9f9f9",
	},
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	logo: {
		width: 120,
		height: 120,
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 24,
		textAlign: "center",
	},
	messageContainer: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
		width: "100%",
	},
	successContainer: {
		backgroundColor: "#e8f5e9",
		borderColor: "#4caf50",
		borderWidth: 1,
	},
	errorContainer: {
		backgroundColor: "#ffebee",
		borderColor: "#f44336",
		borderWidth: 1,
	},
	message: {
		fontSize: 16,
		textAlign: "center",
		color: "#333",
	},
	button: {
		backgroundColor: "#3f51b5",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		width: "100%",
		alignItems: "center",
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});
