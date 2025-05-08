import React, { useState } from "react";
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
import { UserRole } from "../../lib/supabase";

export default function SignupScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
	const [loading, setLoading] = useState(false);

	const { signUp } = useAuth();

	const handleSignup = async () => {
		// Input validation
		if (!email || !password || !confirmPassword) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			Alert.alert("Error", "Please enter a valid email address");
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
			const { error } = await signUp(email, password, selectedRole);
			console.log("Error", error);

			if (error) {
				Alert.alert(
					"Signup Failed",
					error.message || "An error occurred during signup"
				);
			} else {
				Alert.alert(
					"Success",
					"Account created successfully. Please check your email for verification."
				);
			}
		} catch (err) {
			Alert.alert("Error", "An unexpected error occurred");
			console.error(err);
		} finally {
			setLoading(false);
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
});
