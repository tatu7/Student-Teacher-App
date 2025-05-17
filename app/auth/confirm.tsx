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
	Dimensions,
	Platform,
	ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import * as SecureStore from "expo-secure-store";

export default function ConfirmEmailScreen() {
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState(false);
	const [screenWidth, setScreenWidth] = useState(
		Dimensions.get("window").width
	);
	const params = useLocalSearchParams();
	const { signIn } = useAuth();

	// Listen for screen dimension changes
	useEffect(() => {
		const subscription = Dimensions.addEventListener("change", ({ window }) => {
			setScreenWidth(window.width);
		});
		return () => subscription?.remove();
	}, []);

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

	// Calculate responsive font and spacing values
	const getResponsiveSize = (
		baseSize: number,
		minSize: number,
		breakpoint: number = 380
	): number => {
		return screenWidth < breakpoint ? minSize : baseSize;
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Email Confirmation",
					headerShown: true,
					headerTitleStyle: styles.headerTitle,
					headerStyle: {
						backgroundColor: "#fff",
					},
				}}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}>
				<View style={styles.cardContainer}>
					<View style={styles.card}>
						<Image
							source={require("../../assets/images/logo.png")}
							style={[
								styles.logo,
								{
									width: getResponsiveSize(120, 100),
									height: getResponsiveSize(120, 100),
									marginBottom: getResponsiveSize(24, 16),
								},
							]}
							resizeMode='contain'
						/>

						<Text
							style={[
								styles.title,
								{
									fontSize: getResponsiveSize(24, 20),
									marginBottom: getResponsiveSize(20, 16),
								},
							]}>
							Email Confirmation
						</Text>

						{loading ? (
							<ActivityIndicator
								size={screenWidth < 380 ? "small" : "large"}
								color='#4169e1'
							/>
						) : (
							<>
								<View
									style={[
										styles.messageContainer,
										success ? styles.successContainer : styles.errorContainer,
										{ padding: getResponsiveSize(16, 12) },
									]}>
									<Text
										style={[
											styles.message,
											{ fontSize: getResponsiveSize(16, 14) },
										]}>
										{message}
									</Text>
								</View>

								<TouchableOpacity
									style={[
										styles.button,
										{
											paddingVertical: getResponsiveSize(16, 14),
											paddingHorizontal: getResponsiveSize(24, 16),
										},
									]}
									onPress={goToLogin}>
									<Text
										style={[
											styles.buttonText,
											{ fontSize: getResponsiveSize(16, 14) },
										]}>
										Go to Login
									</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	scrollContainer: {
		flexGrow: 1,
		minHeight: Dimensions.get("window").height * 0.9,
	},
	cardContainer: {
		padding: 20,
		justifyContent: "center",
		alignItems: "center",
		minHeight: Dimensions.get("window").height * 0.9,
	},
	card: {
		backgroundColor: "rgba(255, 255, 255, 0.95)",
		borderRadius: 20,
		padding: 24,
		width: "100%",
		maxWidth: 400,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
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
		marginBottom: 20,
		textAlign: "center",
	},
	messageContainer: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
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
		backgroundColor: "#4169e1",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 12,
		width: "100%",
		alignItems: "center",
		shadowColor: "#4169e1",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 3,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
});
