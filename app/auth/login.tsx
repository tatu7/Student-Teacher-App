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
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { Link, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const { signIn } = useAuth();

	const handleLogin = async () => {
		// Input validation
		if (!email || !password) {
			Alert.alert("Error", "Please fill in all fields");
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
			const { error } = await signIn(email, password);

			if (error) {
				Alert.alert(
					"Login Failed",
					error.message || "An error occurred during login"
				);
			}
		} catch (err) {
			Alert.alert("Error", "An unexpected error occurred");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

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
						<Image
							source={require("../../assets/images/logo.png")}
							style={styles.logo}
							resizeMode='contain'
						/>
						<Text style={styles.appName}>EduConnect</Text>
						<Text style={styles.appTagline}>
							Student-Teacher Learning Platform
						</Text>
					</View>

					<View style={styles.formContainer}>
						<Text style={styles.title}>Welcome Back</Text>
						<Text style={styles.subtitle}>Log in to your account</Text>

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
								placeholder='Enter your password'
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>

							<View style={styles.forgotPassword}>
								<Link href='/auth/forgot-password'>
									<Text style={styles.forgotPasswordText}>
										Forgot Password?
									</Text>
								</Link>
							</View>
						</View>

						<TouchableOpacity
							style={styles.button}
							onPress={handleLogin}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' size='small' />
							) : (
								<Text style={styles.buttonText}>Log In</Text>
							)}
						</TouchableOpacity>

						<View style={styles.footer}>
							<Text style={styles.footerText}>Don't have an account? </Text>
							<Link href='/auth/signup'>
								<Text style={styles.link}>Sign Up</Text>
							</Link>
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
	logo: {
		width: 80,
		height: 80,
		marginBottom: 16,
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
	forgotPassword: {
		alignSelf: "flex-end",
		marginBottom: 16,
	},
	forgotPasswordText: {
		color: "#3f51b5",
		fontWeight: "600",
		fontSize: 14,
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
