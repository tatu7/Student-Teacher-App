import React, { useState } from "react";
import {
	StyleSheet,
	TextInput,
	View,
	Text,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [resetSent, setResetSent] = useState(false);
	const { resetPassword } = useAuth();

	const handleResetPassword = async () => {
		// Input validation
		if (!email) {
			Alert.alert("Error", "Please enter your email address");
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			Alert.alert("Error", "Please enter a valid email address");
			return;
		}

		setLoading(true);
		try {
			const { error } = await resetPassword(email);

			if (error) {
				Alert.alert(
					"Error",
					error.message || "Failed to send password reset email"
				);
			} else {
				setResetSent(true);
			}
		} catch (err) {
			Alert.alert("Error", "An unexpected error occurred");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Stack.Screen options={{ title: "Forgot Password" }} />

			{resetSent ? (
				<View style={styles.successContainer}>
					<Text style={styles.title}>Check Your Email</Text>
					<Text style={styles.successText}>
						We've sent password reset instructions to {email}. Please check your
						email inbox.
					</Text>
					<TouchableOpacity
						style={styles.button}
						onPress={() => router.push("/auth/login")}>
						<Text style={styles.buttonText}>Back to Login</Text>
					</TouchableOpacity>
				</View>
			) : (
				<>
					<Text style={styles.title}>Forgot Password</Text>
					<Text style={styles.description}>
						Enter your email address and we'll send you a link to reset your
						password.
					</Text>

					<View style={styles.inputContainer}>
						<TextInput
							style={styles.input}
							placeholder='Email'
							value={email}
							onChangeText={setEmail}
							autoCapitalize='none'
							keyboardType='email-address'
						/>
					</View>

					<TouchableOpacity
						style={styles.button}
						onPress={handleResetPassword}
						disabled={loading}>
						{loading ? (
							<ActivityIndicator color='#fff' />
						) : (
							<Text style={styles.buttonText}>Send Reset Link</Text>
						)}
					</TouchableOpacity>

					<View style={styles.footer}>
						<Text style={styles.footerText}>Remembered your password? </Text>
						<TouchableOpacity onPress={() => router.push("/auth/login")}>
							<Text style={styles.link}>Login</Text>
						</TouchableOpacity>
					</View>
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
		backgroundColor: "#f5f5f5",
	},
	title: {
		fontSize: 26,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	description: {
		fontSize: 16,
		color: "#666",
		marginBottom: 30,
		textAlign: "center",
	},
	inputContainer: {
		width: "100%",
		marginBottom: 20,
	},
	input: {
		backgroundColor: "white",
		padding: 15,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	button: {
		backgroundColor: "#007AFF",
		padding: 15,
		borderRadius: 8,
		alignItems: "center",
	},
	buttonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	footer: {
		marginTop: 20,
		flexDirection: "row",
		justifyContent: "center",
	},
	footerText: {
		color: "#666",
	},
	link: {
		color: "#007AFF",
		fontWeight: "bold",
	},
	successContainer: {
		alignItems: "center",
	},
	successText: {
		fontSize: 16,
		color: "#666",
		marginBottom: 30,
		textAlign: "center",
	},
});
