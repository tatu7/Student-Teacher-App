import React from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	SafeAreaView,
	Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function OnboardingScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ headerShown: false }} />

			<View style={styles.content}>
				<View style={styles.logoContainer}>
					<Ionicons name='book' size={64} color='#4169e1' />
					<Text style={styles.appName}>Solo Study</Text>
				</View>

				<View style={styles.textContainer}>
					<Text style={styles.headerText}>
						O'rganing, O'rgating, Rivojlaning
					</Text>

					<Text style={styles.descriptionText}>
						Ta'lim vazifalarini boshqarish va o'quvchi rivojini kuzatishning
						samarali usuli
					</Text>
				</View>

				<View style={styles.buttonContainer}>
					<TouchableOpacity
						style={styles.primaryButton}
						onPress={() => router.push("/auth/login")}>
						<Text style={styles.primaryButtonText}>Boshladik</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={() => router.push("/auth/signup")}>
						<Text style={styles.secondaryButtonText}>Ro'yxatdan o'tish</Text>
					</TouchableOpacity>
				</View>

				<Text style={styles.footerText}>
					Samarali ta'lim uchun o'quvchilar va o'qituvchilarni birlashtiramiz
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#ffffff",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: 40,
	},
	appName: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#4169e1",
		marginTop: 12,
	},
	textContainer: {
		alignItems: "center",
		marginBottom: 48,
	},
	headerText: {
		fontSize: 22,
		fontWeight: "600",
		color: "#333",
		textAlign: "center",
		marginBottom: 16,
	},
	descriptionText: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 24,
	},
	buttonContainer: {
		width: "100%",
		marginBottom: 40,
	},
	primaryButton: {
		backgroundColor: "#4169e1",
		paddingVertical: 16,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: 16,
	},
	primaryButtonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "bold",
	},
	secondaryButton: {
		backgroundColor: "white",
		paddingVertical: 16,
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#4169e1",
	},
	secondaryButtonText: {
		color: "#4169e1",
		fontSize: 18,
		fontWeight: "600",
	},
	footerText: {
		fontSize: 14,
		color: "#888",
		textAlign: "center",
		paddingHorizontal: 32,
	},
});
