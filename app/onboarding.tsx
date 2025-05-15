import React from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	SafeAreaView,
	Image,
	Dimensions,
	ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;

export default function OnboardingScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ headerShown: false }} />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				<View style={styles.content}>
					<View style={styles.logoContainer}>
						<Ionicons
							name='book'
							size={isSmallDevice ? 48 : 64}
							color='#4169e1'
						/>
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
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#ffffff",
	},
	scrollContent: {
		flexGrow: 1,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: width * 0.06, // Responsive padding
		paddingVertical: height * 0.04,
		minHeight: height * 0.9, // Ensure content takes most of the screen height
	},
	logoContainer: {
		alignItems: "center",
		marginBottom: height * 0.04,
	},
	appName: {
		fontSize: isSmallDevice ? 28 : 32,
		fontWeight: "bold",
		color: "#4169e1",
		marginTop: height * 0.015,
	},
	textContainer: {
		alignItems: "center",
		marginBottom: height * 0.05,
		width: "100%",
	},
	headerText: {
		fontSize: isSmallDevice ? 20 : 22,
		fontWeight: "600",
		color: "#333",
		textAlign: "center",
		marginBottom: height * 0.02,
	},
	descriptionText: {
		fontSize: isSmallDevice ? 14 : 16,
		color: "#666",
		textAlign: "center",
		lineHeight: isSmallDevice ? 22 : 24,
	},
	buttonContainer: {
		width: "100%",
		marginBottom: height * 0.04,
	},
	primaryButton: {
		backgroundColor: "#4169e1",
		paddingVertical: height * 0.02,
		borderRadius: 8,
		alignItems: "center",
		marginBottom: height * 0.02,
	},
	primaryButtonText: {
		color: "white",
		fontSize: isSmallDevice ? 16 : 18,
		fontWeight: "bold",
	},
	secondaryButton: {
		backgroundColor: "white",
		paddingVertical: height * 0.02,
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#4169e1",
	},
	secondaryButtonText: {
		color: "#4169e1",
		fontSize: isSmallDevice ? 16 : 18,
		fontWeight: "600",
	},
	footerText: {
		fontSize: isSmallDevice ? 12 : 14,
		color: "#888",
		textAlign: "center",
		paddingHorizontal: width * 0.08,
	},
});
