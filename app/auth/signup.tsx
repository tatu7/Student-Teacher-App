import React, { useState } from "react";
import {
	StyleSheet,
	TextInput,
	View,
	Text,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { Link, Stack } from "expo-router";
import { useAuth, UserRole } from "../../context/AuthContext";

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
		<ScrollView contentContainerStyle={styles.container}>
			<Stack.Screen options={{ title: "Sign Up" }} />

			<Text style={styles.title}>Create an Account</Text>

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

				<TextInput
					style={styles.input}
					placeholder='Confirm Password'
					value={confirmPassword}
					onChangeText={setConfirmPassword}
					secureTextEntry
				/>

				<Text style={styles.sectionTitle}>Select your role</Text>

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
					<ActivityIndicator color='#fff' />
				) : (
					<Text style={styles.buttonText}>Sign Up</Text>
				)}
			</TouchableOpacity>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Already have an account? </Text>
				<Link href='/auth/login' asChild>
					<TouchableOpacity>
						<Text style={styles.link}>Login</Text>
					</TouchableOpacity>
				</Link>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
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
	sectionTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 10,
		marginTop: 10,
	},
	roleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	roleButton: {
		flex: 1,
		padding: 15,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
		backgroundColor: "white",
		marginHorizontal: 5,
		alignItems: "center",
	},
	selectedRoleButton: {
		borderColor: "#007AFF",
		backgroundColor: "#E8F1FF",
	},
	roleButtonText: {
		fontWeight: "bold",
		color: "#333",
	},
	selectedRoleButtonText: {
		color: "#007AFF",
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
});
