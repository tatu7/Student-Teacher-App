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
	Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
	UserRole,
	validateEmail,
	resendConfirmationEmail,
} from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;

export default function SignupScreen() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
	const [loading, setLoading] = useState(false);
	const [signupSuccess, setSignupSuccess] = useState(false);
	const [resendingEmail, setResendingEmail] = useState(false);
	const [lastResendTime, setLastResendTime] = useState<number | null>(null);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

	const handleSignup = async () => {
		// Input validation
		if (!name || !email || !password || !confirmPassword) {
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
				selectedRole,
				name
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
			<Stack.Screen
				options={{
					headerTitle: "Hisob yaratish",
					headerTitleStyle: styles.headerTitle,
					headerLeft: () => (
						<TouchableOpacity
							style={styles.backButton}
							onPress={() => router.push("/onboarding")}>
							<Ionicons name='arrow-back' size={24} color='#333' />
						</TouchableOpacity>
					),
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidView}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}>
					<View style={styles.welcomeTextContainer}>
						<Text style={styles.title}>Hisob yaratish</Text>
						<Text style={styles.subtitle}>Hamkor t'alimga qo'shiling</Text>
					</View>

					<View style={styles.formContainer}>
						<View style={styles.inputContainer}>
							<Text style={styles.inputLabel}>Ismingiz</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name='person-outline'
									size={22}
									color='#888'
									style={styles.inputIcon}
								/>
								<TextInput
									style={styles.input}
									placeholder='Ismingizni kiriting'
									value={name}
									onChangeText={setName}
								/>
							</View>

							<Text style={styles.inputLabel}>Email</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name='mail-outline'
									size={22}
									color='#888'
									style={styles.inputIcon}
								/>
								<TextInput
									style={styles.input}
									placeholder='Email kiriting'
									value={email}
									onChangeText={setEmail}
									autoCapitalize='none'
									keyboardType='email-address'
								/>
							</View>

							<Text style={styles.inputLabel}>Parol</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name='lock-closed-outline'
									size={22}
									color='#888'
									style={styles.inputIcon}
								/>
								<TextInput
									style={styles.input}
									placeholder='Parolni kiriting'
									value={password}
									onChangeText={setPassword}
									secureTextEntry={!showPassword}
								/>
								<TouchableOpacity
									style={styles.eyeIcon}
									onPress={() => setShowPassword(!showPassword)}>
									<Ionicons
										name={showPassword ? "eye-off-outline" : "eye-outline"}
										size={22}
										color='#888'
									/>
								</TouchableOpacity>
							</View>

							<Text style={styles.inputLabel}>Parolni tasdiqlang</Text>
							<View style={styles.inputWrapper}>
								<Ionicons
									name='lock-closed-outline'
									size={22}
									color='#888'
									style={styles.inputIcon}
								/>
								<TextInput
									style={styles.input}
									placeholder='Parolni qayta kiriting'
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									secureTextEntry={!showConfirmPassword}
								/>
								<TouchableOpacity
									style={styles.eyeIcon}
									onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
									<Ionicons
										name={
											showConfirmPassword ? "eye-off-outline" : "eye-outline"
										}
										size={22}
										color='#888'
									/>
								</TouchableOpacity>
							</View>
						</View>

						<Text style={styles.inputLabel}>Men:</Text>
						<View style={styles.roleContainer}>
							<TouchableOpacity
								style={[
									styles.roleButton,
									selectedRole === UserRole.STUDENT &&
										styles.selectedRoleButton,
								]}
								onPress={() => setSelectedRole(UserRole.STUDENT)}>
								<Text
									style={[
										styles.roleButtonText,
										selectedRole === UserRole.STUDENT &&
											styles.selectedRoleButtonText,
									]}>
									O'quvchi
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.roleButton,
									selectedRole === UserRole.TEACHER &&
										styles.selectedRoleButton,
								]}
								onPress={() => setSelectedRole(UserRole.TEACHER)}>
								<Text
									style={[
										styles.roleButtonText,
										selectedRole === UserRole.TEACHER &&
											styles.selectedRoleButtonText,
									]}>
									O'qituvchi
								</Text>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={styles.button}
							onPress={handleSignup}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.buttonText}>Hisob yaratish</Text>
							)}
						</TouchableOpacity>

						<View style={styles.footer}>
							<Text style={styles.footerText}>Hisobingiz bormi? </Text>
							<TouchableOpacity onPress={() => router.push("/auth/login")}>
								<Text style={styles.link}>Kirish</Text>
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
		backgroundColor: "#fff",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	backButton: {
		padding: 8,
		marginLeft: 4,
	},
	keyboardAvoidView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		padding: 20,
		paddingTop: 30,
	},
	welcomeTextContainer: {
		marginBottom: 20,
		marginTop: 10,
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
		width: "100%",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 24,
	},
	inputContainer: {
		width: "100%",
		marginBottom: 24,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: "#333",
		marginBottom: 8,
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		marginBottom: 16,
		paddingHorizontal: 12,
	},
	inputIcon: {
		marginRight: 10,
	},
	eyeIcon: {
		padding: 10,
	},
	input: {
		flex: 1,
		height: 50,
		fontSize: 16,
	},
	roleContainer: {
		flexDirection: "row",
		marginBottom: 24,
	},
	roleButton: {
		flex: 1,
		height: 48,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 8,
	},
	selectedRoleButton: {
		borderColor: "#3f51b5",
		backgroundColor: "#eef0ff",
	},
	roleButtonText: {
		fontWeight: "500",
		color: "#333",
	},
	selectedRoleButtonText: {
		color: "#3f51b5",
	},
	button: {
		backgroundColor: "#3f51b5",
		height: 50,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	buttonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 16,
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
		borderRadius: 8,
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
