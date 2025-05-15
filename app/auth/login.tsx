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
	Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { UserRole } from "../../lib/supabase";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;

export default function LoginScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const { signIn, user } = useAuth();

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
			} else {
				// Get the current user role and navigate accordingly
				if (user) {
					if (user.role === UserRole.TEACHER) {
						router.replace("/teacher/dashboard");
					} else {
						router.replace("/student/dashboard");
					}
				}
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
			<Stack.Screen
				options={{
					headerTitle: "",
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
					<View style={styles.contentContainer}>
						<View style={styles.welcomeTextContainer}>
							<Text style={styles.title}>Xush kelibsiz!</Text>
							<Text style={styles.subtitle}>Hisobingizga kiring</Text>
						</View>

						<View style={styles.formContainer}>
							<View style={styles.inputContainer}>
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

								<Text style={styles.inputLabel}>Password</Text>
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

								<View style={styles.forgotPassword}>
									<TouchableOpacity
										onPress={() => router.push("/auth/forgot-password")}>
										<Text style={styles.forgotPasswordText}>
											Parolni unutdingizmi?
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							<TouchableOpacity
								style={styles.button}
								onPress={handleLogin}
								disabled={loading}>
								{loading ? (
									<ActivityIndicator color='#fff' size='small' />
								) : (
									<Text style={styles.buttonText}>Kirish</Text>
								)}
							</TouchableOpacity>

							<View style={styles.footer}>
								<Text style={styles.footerText}>Hisobingiz yo'qmi? </Text>
								<TouchableOpacity onPress={() => router.push("/auth/signup")}>
									<Text style={styles.link}>Ro'yxatdan o'ting</Text>
								</TouchableOpacity>
							</View>
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
	backButton: {
		padding: 8,
		marginLeft: 4,
	},
	keyboardAvoidView: {
		flex: 1,
		justifyContent: "center",
	},
	scrollContent: {
		flexGrow: 1,
		padding: width * 0.05,
		justifyContent: "center",
	},
	contentContainer: {
		width: "100%",
		maxWidth: 400,
		alignSelf: "center",
	},
	welcomeTextContainer: {
		marginBottom: height * 0.035,
		marginTop: height * 0.025,
		alignItems: "center",
	},
	formContainer: {
		width: "100%",
		alignItems: "center",
	},
	title: {
		fontSize: isSmallDevice ? 24 : 28,
		fontWeight: "bold",
		color: "#333",
		marginBottom: height * 0.01,
		textAlign: "center",
	},
	subtitle: {
		fontSize: isSmallDevice ? 16 : 18,
		color: "#666",
		marginBottom: height * 0.025,
		textAlign: "center",
	},
	inputContainer: {
		width: "100%",
		marginBottom: height * 0.03,
	},
	inputLabel: {
		fontSize: isSmallDevice ? 14 : 16,
		fontWeight: "500",
		color: "#333",
		marginBottom: height * 0.01,
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		marginBottom: height * 0.02,
		paddingHorizontal: width * 0.03,
		height: isSmallDevice ? 45 : 50,
	},
	inputIcon: {
		marginRight: width * 0.025,
	},
	eyeIcon: {
		padding: isSmallDevice ? 8 : 10,
	},
	input: {
		flex: 1,
		height: "100%",
		fontSize: isSmallDevice ? 14 : 16,
	},
	forgotPassword: {
		alignSelf: "flex-end",
		marginTop: height * 0.005,
		marginBottom: height * 0.02,
	},
	forgotPasswordText: {
		color: "#3f51b5",
		fontWeight: "500",
		fontSize: isSmallDevice ? 13 : 14,
	},
	button: {
		backgroundColor: "#3f51b5",
		height: isSmallDevice ? 45 : 50,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: height * 0.02,
		width: "100%",
	},
	buttonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: isSmallDevice ? 15 : 16,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: height * 0.02,
		width: "100%",
	},
	footerText: {
		color: "#666",
		fontSize: isSmallDevice ? 14 : 15,
	},
	link: {
		color: "#3f51b5",
		fontWeight: "bold",
		fontSize: isSmallDevice ? 14 : 15,
	},
});
