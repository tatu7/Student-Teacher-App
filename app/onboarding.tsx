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
import { icons } from "../constants/icons";
import CustomBackground from "@/components/CustomBackground";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;

export default function OnboardingScreen() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{ headerShown: false }} />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				<CustomBackground image={icons.bg3}>
					<View style={styles.cardContainer}>
						<View style={styles.card}>
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
									Ta'lim vazifalarini boshqarish va o'quvchi rivojini
									kuzatishning samarali usuli
								</Text>
							</View>

							<View style={styles.buttonContainer}>
								<TouchableOpacity
									style={styles.primaryButton}
									onPress={() => router.push("/auth/login")}>
									<Text style={styles.primaryButtonText}>Boshladik</Text>
								</TouchableOpacity>
							</View>

							<Text style={styles.footerText}>
								Samarali ta'lim uchun o'quvchilar va o'qituvchilarni
								birlashtiramiz
							</Text>
						</View>
					</View>
				</CustomBackground>
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
	cardContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: width * 0.06,
		paddingVertical: height * 0.04,
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
		borderRadius: 12,
		alignItems: "center",
		marginBottom: height * 0.02,
		shadowColor: "#4169e1",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 3,
	},
	primaryButtonText: {
		color: "white",
		fontSize: isSmallDevice ? 16 : 18,
		fontWeight: "bold",
	},
	secondaryButton: {
		backgroundColor: "white",
		paddingVertical: height * 0.02,
		borderRadius: 12,
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
		paddingHorizontal: width * 0.04,
	},
});
