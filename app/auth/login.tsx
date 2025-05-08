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
		<View style={styles.container}>
			<Stack.Screen options={{ title: "Login" }} />

			<Text style={styles.title}>Login</Text>

			<View style={styles.inputContainer}>
				<TextInput
					style={styles.input}
					placeholder='Email'
					value={email}
					onChangeText={setEmail}
					autoCapitalize='none'
					keyboardType='email-address'
				/>

				<TextInput
					style={styles.input}
					placeholder='Password'
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>
			</View>

			<TouchableOpacity
				style={styles.button}
				onPress={handleLogin}
				disabled={loading}>
				{loading ? (
					<ActivityIndicator color='#fff' />
				) : (
					<Text style={styles.buttonText}>Login</Text>
				)}
			</TouchableOpacity>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Don't have an account? </Text>
				<Link href='/auth/signup' asChild>
					<TouchableOpacity>
						<Text style={styles.link}>Sign Up</Text>
					</TouchableOpacity>
				</Link>
			</View>

			<Link href='/auth/forgot-password' asChild>
				<TouchableOpacity style={styles.forgotPassword}>
					<Text style={styles.link}>Forgot Password?</Text>
				</TouchableOpacity>
			</Link>
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
		marginBottom: 15,
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
	forgotPassword: {
		marginTop: 15,
		alignItems: "center",
	},
});
