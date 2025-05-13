import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	TextInput,
	View,
	Text,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
	UserRole,
	validateEmail,
	resendConfirmationEmail,
	sendConfirmationEmail,
} from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function SignupScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
	const [loading, setLoading] = useState(false);
	const [signupSuccess, setSignupSuccess] = useState(false);
	const [resendingEmail, setResendingEmail] = useState(false);
	const [lastResendTime, setLastResendTime] = useState<number | null>(null);

	const { signUp } = useAuth();

	// Set flag in SecureStore to prevent auto-navigation during signup/confirmation flow
	useEffect(() => {
		SecureStore.setItemAsync("preventAutoNavigation", "true").catch((err) =>
			console.error("Error setting navigation flag:", err)
		);

		return () => {
			// Keep the flag if we're going to verification screen
			if (!signupSuccess) {
				SecureStore.deleteItemAsync("preventAutoNavigation").catch((err) =>
					console.error("Error removing navigation flag:", err)
				);
			}
		};
	}, [signupSuccess]);

	// Debug useEffect to track state changes
	useEffect(() => {
		console.log("Signup success state:", signupSuccess);
	}, [signupSuccess]);

	const handleSignup = async () => {
		// Input validation
		if (!email || !password || !confirmPassword) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		// Email validation
		if (!validateEmail(email)) {
			Alert.alert(
				"Error",
				"Please enter a valid email address. The email format is incorrect or the domain is not supported."
			);
			return;
		}

		// Password validation
		if (password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters long");
			return;
		}

		// Confirm password validation
		if (password !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		// Role validation
		if (!selectedRole) {
			Alert.alert("Error", "Please select a role");
			return;
		}

		setLoading(true);
		try {
			const { error, userCreated } = await signUp(
				email,
				password,
				selectedRole
			);

			if (error) {
				// Handle the error properly, get the error message
				let errorMessage = "An error occurred during signup";

				// Check if error is an object with message property
				if (typeof error === "object" && error !== null) {
					if ("message" in error) {
						errorMessage = error.message as string;
					} else if ("error_description" in error) {
						errorMessage = error.error_description as string;
					}
				}

				// Show alert with error message
				Alert.alert("Signup Failed", errorMessage);
				return;
			}

			// Force the signup success state to true for the verification screen
			setSignupSuccess(true);

			// Store email in SecureStore for confirmation page to use
			SecureStore.setItemAsync("pendingConfirmationEmail", email).catch(
				(err) => {
					// Don't log this error to console, just silently continue
				}
			);

			// Do NOT attempt to send a confirmation email here as it will cause a rate-limit error
			// Supabase has already sent the initial confirmation email during signUp
		} catch (err) {
			// Error handling for unexpected errors - don't log to console

			// Try to extract a message from the error
			let errorMessage = "An unexpected error occurred";
			if (err instanceof Error) {
				errorMessage = err.message;
			} else if (typeof err === "object" && err !== null && "message" in err) {
				errorMessage = (err as any).message;
			}

			Alert.alert("Error", errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleResendEmail = async () => {
		if (!email) return;

		// Check if we've tried to resend within the last 60 seconds
		const now = Date.now();
		if (lastResendTime && now - lastResendTime < 60000) {
			// Calculate remaining time
			const remainingSeconds = Math.ceil(
				(60000 - (now - lastResendTime)) / 1000
			);
			Alert.alert(
				"Please Wait",
				`You can request another confirmation email in ${remainingSeconds} seconds.`
			);
			return;
		}

		setResendingEmail(true);
		try {
			const { error } = await resendConfirmationEmail(email);

			if (error) {
				// Check for rate limit error specifically
				if (typeof error === "object" && error !== null && "message" in error) {
					const errorMessage = error.message as string;
					if (
						errorMessage.includes("security purposes") ||
						errorMessage.includes("rate limit") ||
						(typeof error === "object" &&
							"status" in error &&
							error.status === 429)
					) {
						// Extract the wait time if available in the message
						const waitTimeMatch = errorMessage.match(/after (\d+) seconds/);
						const waitTime = waitTimeMatch ? waitTimeMatch[1] : "60";

						Alert.alert(
							"Rate Limited",
							`For security reasons, please wait ${waitTime} seconds before requesting another email.`
						);

						// Set the last resend time to properly track the cooldown
						setLastResendTime(now);
						return;
					}
				}

				// Handle other errors
				const errorMessage =
					typeof error === "object" && error !== null && "message" in error
						? error.message
						: "Unknown error";

				Alert.alert("Error", `Failed to resend email: ${errorMessage}`);
			} else {
				Alert.alert(
					"Success",
					"Confirmation email has been resent to your email address"
				);
				// Track successful resend time
				setLastResendTime(now);
			}
		} catch (e) {
			Alert.alert("Error", "Failed to resend confirmation email");
			console.error(e);
		} finally {
			setResendingEmail(false);
		}
	};

	const RoleButton = ({ role, title }: { role: UserRole; title: string }) => (
		<TouchableOpacity
			style={[
				styles.roleButton,
				selectedRole === role && styles.selectedRoleButton,
			]}
			onPress={() => setSelectedRole(role)}>
			<Text
				style={[
					styles.roleButtonText,
					selectedRole === role && styles.selectedRoleButtonText,
				]}>
				{title}
			</Text>
		</TouchableOpacity>
	);

	if (signupSuccess) {
		return (
			<SafeAreaView style={styles.container}>
				<KeyboardAvoidingView
					style={styles.keyboardAvoidView}
					behavior={Platform.OS === "ios" ? "padding" : "height"}>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps='handled'>
						<View style={styles.formContainer}>
							<Text style={styles.title}>Verify Your Email</Text>

							<View style={styles.successMessageContainer}>
								<Ionicons
									name='mail'
									size={60}
									color='#3f51b5'
									style={styles.emailIcon}
								/>
								<Text style={styles.successMessage}>
									We've sent a confirmation email to:
								</Text>
								<Text style={styles.emailText}>{email}</Text>
								<Text style={styles.instructionsText}>
									Please check your email and click the confirmation link to
									activate your account.
								</Text>
							</View>

							<TouchableOpacity
								style={styles.resendButton}
								onPress={handleResendEmail}
								disabled={resendingEmail}>
								{resendingEmail ? (
									<ActivityIndicator color='#3f51b5' size='small' />
								) : (
									<Text style={styles.resendButtonText}>
										Didn't receive the email? Resend
									</Text>
								)}
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.button}
								onPress={() => router.push("/auth/login")}>
								<Text style={styles.buttonText}>Go to Login</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ headerShown: false }} />

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidView}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}>
					<View style={styles.logoContainer}>
						<Text style={styles.appName}>EduConnect</Text>
						<Text style={styles.appTagline}>
							Student-Teacher Learning Platform
						</Text>
					</View>

					<View style={styles.formContainer}>
						<Text style={styles.title}>Create an Account</Text>
						<Text style={styles.subtitle}>Join our learning community</Text>

						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Email</Text>
							<TextInput
								style={styles.input}
								placeholder='Enter your email'
								value={email}
								onChangeText={setEmail}
								autoCapitalize='none'
								keyboardType='email-address'
							/>

							<Text style={styles.inputLabel}>Password</Text>
							<TextInput
								style={styles.input}
								placeholder='Create a password'
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>

							<Text style={styles.inputLabel}>Confirm Password</Text>
							<TextInput
								style={styles.input}
								placeholder='Confirm your password'
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								secureTextEntry
							/>

							<Text style={styles.inputLabel}>Select your role</Text>
							<View style={styles.roleContainer}>
								<RoleButton role={UserRole.TEACHER} title='Teacher' />
								<RoleButton role={UserRole.STUDENT} title='Student' />
							</View>
						</View>

						<TouchableOpacity
							style={styles.button}
							onPress={handleSignup}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.buttonText}>Create Account</Text>
							)}
						</TouchableOpacity>

						<View style={styles.footer}>
							<Text style={styles.footerText}>Already have an account? </Text>
							<TouchableOpacity onPress={() => router.push("/auth/login")}>
								<Text style={styles.link}>Log In</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9f9f9",
	},
	keyboardAvoidView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		padding: 24,
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: 40,
	},
	appName: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#3f51b5",
		marginBottom: 8,
	},
	appTagline: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
	},
	formContainer: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 5,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 8,
		color: "#333",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 24,
		textAlign: "center",
	},
	inputContainer: {
		width: "100%",
		marginBottom: 24,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	input: {
		backgroundColor: "#f5f7fa",
		padding: 16,
		borderRadius: 12,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: "#e0e6ed",
		fontSize: 16,
	},
	roleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	roleButton: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e0e6ed",
		backgroundColor: "#f5f7fa",
		marginHorizontal: 5,
		alignItems: "center",
	},
	selectedRoleButton: {
		borderColor: "#3f51b5",
		backgroundColor: "#ebefff",
	},
	roleButtonText: {
		fontWeight: "600",
		color: "#666",
		fontSize: 16,
	},
	selectedRoleButtonText: {
		color: "#3f51b5",
	},
	button: {
		backgroundColor: "#3f51b5",
		padding: 16,
		borderRadius: 12,
		alignItems: "center",
		shadowColor: "#3f51b5",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	buttonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	footer: {
		marginTop: 24,
		flexDirection: "row",
		justifyContent: "center",
	},
	footerText: {
		color: "#666",
		fontSize: 15,
	},
	link: {
		color: "#3f51b5",
		fontWeight: "bold",
		fontSize: 15,
	},
	successMessageContainer: {
		alignItems: "center",
		padding: 24,
		marginBottom: 20,
	},
	emailIcon: {
		marginBottom: 20,
	},
	successMessage: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 10,
	},
	emailText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#3f51b5",
		marginBottom: 20,
	},
	instructionsText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 22,
	},
	resendButton: {
		backgroundColor: "transparent",
		padding: 16,
		borderRadius: 12,
		alignItems: "center",
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#3f51b5",
	},
	resendButtonText: {
		color: "#3f51b5",
		fontWeight: "bold",
		fontSize: 14,
	},
});
