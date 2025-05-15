import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	TextInput,
	View,
	Text,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Dimensions,
	Platform,
	ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [resetSent, setResetSent] = useState(false);
	const [screenWidth, setScreenWidth] = useState(
		Dimensions.get("window").width
	);
	const { resetPassword } = useAuth();

	useEffect(() => {
		const subscription = Dimensions.addEventListener("change", ({ window }) => {
			setScreenWidth(window.width);
		});
		return () => subscription?.remove();
	}, []);

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
		<ScrollView contentContainerStyle={styles.scrollContainer}>
			<View
				style={[
					styles.container,
					{ paddingHorizontal: screenWidth < 380 ? 15 : 20 },
				]}>
				<Stack.Screen options={{ title: "Forgot Password" }} />

				{resetSent ? (
					<View style={styles.successContainer}>
						<Text
							style={[styles.title, { fontSize: screenWidth < 380 ? 22 : 26 }]}>
							Parolni tiklash
						</Text>
						<Text
							style={[
								styles.successText,
								{ fontSize: screenWidth < 380 ? 14 : 16 },
							]}>
							Parolni tiklash xabari {email} ga yuborildi. Iltimos, elektron
							pochta inglizchasi orqali tekshirish.
						</Text>
						<TouchableOpacity
							style={[
								styles.button,
								{ width: screenWidth < 380 ? "100%" : "90%" },
							]}
							onPress={() => router.push("/auth/login")}>
							<Text style={styles.buttonText}>Kirish</Text>
						</TouchableOpacity>
					</View>
				) : (
					<>
						<Text
							style={[styles.title, { fontSize: screenWidth < 380 ? 22 : 26 }]}>
							Parolni tiklash
						</Text>
						<Text
							style={[
								styles.description,
								{ fontSize: screenWidth < 380 ? 14 : 16 },
							]}>
							Email manzilingizni kiriting va parolni tiklash xabari sizga
							yuboriladi.
						</Text>

						<View style={styles.inputContainer}>
							<TextInput
								style={[styles.input, { padding: screenWidth < 380 ? 12 : 15 }]}
								placeholder='Email'
								value={email}
								onChangeText={setEmail}
								autoCapitalize='none'
								keyboardType='email-address'
							/>
						</View>

						<TouchableOpacity
							style={[styles.button, { padding: screenWidth < 380 ? 12 : 15 }]}
							onPress={handleResetPassword}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color='#fff' />
							) : (
								<Text
									style={[
										styles.buttonText,
										{ fontSize: screenWidth < 380 ? 14 : 16 },
									]}>
									Parolni tiklash xabari yuborish
								</Text>
							)}
						</TouchableOpacity>

						<View style={styles.footer}>
							<Text
								style={[
									styles.footerText,
									{ fontSize: screenWidth < 380 ? 14 : 16 },
								]}>
								Parolni eslayapsizmi?{" "}
							</Text>
							<TouchableOpacity onPress={() => router.push("/auth/login")}>
								<Text
									style={[
										styles.link,
										{ fontSize: screenWidth < 380 ? 14 : 16 },
									]}>
									Kirish
								</Text>
							</TouchableOpacity>
						</View>
					</>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollContainer: {
		flexGrow: 1,
	},
	container: {
		flex: 1,
		padding: 20,
		justifyContent: "center",
		backgroundColor: "#f5f5f5",
		minHeight: Dimensions.get("window").height * 0.9,
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
		backgroundColor: "#3f51b5",
		padding: 15,
		borderRadius: 8,
		alignItems: "center",
		width: "100%",
		...Platform.select({
			ios: {
				shadowColor: "rgba(0,0,0,0.2)",
				shadowOffset: { height: 2, width: 0 },
				shadowOpacity: 0.8,
				shadowRadius: 2,
			},
			android: {
				elevation: 3,
			},
		}),
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
		flexWrap: "wrap",
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
		width: "100%",
	},
	successText: {
		fontSize: 16,
		color: "#666",
		marginBottom: 30,
		textAlign: "center",
	},
});
