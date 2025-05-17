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
import CustomBackground from "@/components/CustomBackground";
import { icons } from "@/constants/icons";

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
							<Text style={styles.title}>Emailni tasdiqlang</Text>

							<View style={styles.successMessageContainer}>
								<Ionicons
									name='mail'
									size={60}
									color='#3f51b5'
									style={styles.emailIcon}
								/>
								<Text style={styles.successMessage}>
									Emailingizga tasdiqlash xatini yubordik:
								</Text>
								<Text style={styles.emailText}>{email}</Text>
								<Text style={styles.instructionsText}>
									Emailingizni tekshiring va tasdiqlash havolasini bosing
									hisobingizni aktivlashtiring.
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
										Emailingiz kelmadi? Yana yuborish
									</Text>
								)}
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.button}
								onPress={() => router.push("/auth/login")}>
								<Text style={styles.buttonText}>Kirish</Text>
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
							<Ionicons name='arrow-back' size={24} color='#4169e1' />
						</TouchableOpacity>
					),
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardAvoidView}>
				<CustomBackground image={icons.bg4}>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}>
						<View style={styles.cardContainer}>
							<View style={styles.card}>
								<View style={styles.welcomeTextContainer}>
									<Text style={styles.title}>Hisob yaratish</Text>
									<Text style={styles.subtitle}>
										Hamkor t'alimga qo'shiling
									</Text>
								</View>

								<View style={styles.formContainer}>
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Ismingiz</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name='person-outline'
												size={22}
												color='#666'
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.input}
												placeholder='Ismingizni kiriting'
												value={name}
												onChangeText={setName}
												placeholderTextColor='#999'
											/>
										</View>

										<Text style={styles.inputLabel}>Email</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name='mail-outline'
												size={22}
												color='#666'
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.input}
												placeholder='Email kiriting'
												value={email}
												onChangeText={setEmail}
												autoCapitalize='none'
												keyboardType='email-address'
												placeholderTextColor='#999'
											/>
										</View>

										<Text style={styles.inputLabel}>Parol</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name='lock-closed-outline'
												size={22}
												color='#666'
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.input}
												placeholder='Parolni kiriting'
												value={password}
												onChangeText={setPassword}
												secureTextEntry={!showPassword}
												placeholderTextColor='#999'
											/>
											<TouchableOpacity
												style={styles.eyeIcon}
												onPress={() => setShowPassword(!showPassword)}>
												<Ionicons
													name={
														showPassword ? "eye-off-outline" : "eye-outline"
													}
													size={22}
													color='#666'
												/>
											</TouchableOpacity>
										</View>

										<Text style={styles.inputLabel}>Parolni tasdiqlang</Text>
										<View style={styles.inputWrapper}>
											<Ionicons
												name='lock-closed-outline'
												size={22}
												color='#666'
												style={styles.inputIcon}
											/>
											<TextInput
												style={styles.input}
												placeholder='Parolni qayta kiriting'
												value={confirmPassword}
												onChangeText={setConfirmPassword}
												secureTextEntry={!showConfirmPassword}
												placeholderTextColor='#999'
											/>
											<TouchableOpacity
												style={styles.eyeIcon}
												onPress={() =>
													setShowConfirmPassword(!showConfirmPassword)
												}>
												<Ionicons
													name={
														showConfirmPassword
															? "eye-off-outline"
															: "eye-outline"
													}
													size={22}
													color='#666'
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
										style={[styles.button, loading && styles.buttonDisabled]}
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
										<TouchableOpacity
											onPress={() => router.push("/auth/login")}>
											<Text style={styles.link}>Kirish</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</View>
					</ScrollView>
				</CustomBackground>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingHorizontal: width * 0.04,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
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
		justifyContent: "center",
	},
	cardContainer: {
		padding: width * 0.05,
		justifyContent: "center",
		alignItems: "center",
		minHeight: height * 0.9,
	},
	card: {
		backgroundColor: "rgba(255, 255, 255, 0.95)",
		borderRadius: 20,
		padding: width * 0.06,
		width: "100%",
		maxWidth: 500,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	welcomeTextContainer: {
		marginBottom: height * 0.03,
		alignItems: "center",
	},
	title: {
		fontSize: isSmallDevice ? 24 : 28,
		fontWeight: "bold",
		color: "#333",
		textAlign: "center",
	},
	subtitle: {
		fontSize: isSmallDevice ? 16 : 18,
		color: "#666",
		textAlign: "center",
	},
	formContainer: {
		width: "100%",
	},
	inputContainer: {
		width: "100%",
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: "#333",
		marginBottom: 4,
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 12,
		marginBottom: 10,
		paddingHorizontal: 12,
		height: isSmallDevice ? 45 : 50,
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
		color: "#333",
	},
	roleContainer: {
		flexDirection: "row",
		marginBottom: 14,
		gap: 12,
	},
	roleButton: {
		flex: 1,
		height: 48,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
	selectedRoleButton: {
		borderColor: "#4169e1",
		backgroundColor: "#EEF2FF",
	},
	roleButtonText: {
		fontWeight: "500",
		color: "#666",
	},
	selectedRoleButtonText: {
		color: "#4169e1",
	},
	button: {
		backgroundColor: "#4169e1",
		height: isSmallDevice ? 45 : 50,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
		shadowColor: "#4169e1",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 3,
	},
	buttonDisabled: {
		opacity: 0.7,
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
		color: "#4169e1",
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
		color: "#333",
		textAlign: "center",
		marginBottom: 10,
	},
	emailText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#4169e1",
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
		borderColor: "#4169e1",
	},
	resendButtonText: {
		color: "#4169e1",
		fontWeight: "bold",
		fontSize: 14,
	},
});
