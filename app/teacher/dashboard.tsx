import React from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

export default function TeacherDashboard() {
	const { user, signOut } = useAuth();

	// Navigate to different sections
	const navigateToGroups = () => router.push("/teacher/groups");
	const navigateToTasks = () => router.push("/teacher/tasks");
	const navigateToSubmissions = () => router.push("/teacher/submissions");

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: "Teacher Dashboard",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					headerRight: () => (
						<TouchableOpacity onPress={signOut} style={styles.logoutButton}>
							<Ionicons name='log-out-outline' size={24} color='#3f51b5' />
						</TouchableOpacity>
					),
				}}
			/>

			<ScrollView style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.welcomeText}>Welcome, Teacher</Text>
					<Text style={styles.emailText}>{user?.email}</Text>
				</View>

				{/* Main Menu Cards */}
				<View style={styles.menuSection}>
					<Text style={styles.sectionTitle}>Teacher Tools</Text>

					<View style={styles.menuGrid}>
						{/* Groups Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToGroups}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e3f2fd" }]}>
								<Ionicons name='people' size={32} color='#2196f3' />
							</View>
							<Text style={styles.menuCardTitle}>Groups</Text>
							<Text style={styles.menuCardSubtitle}>Manage student groups</Text>
						</TouchableOpacity>

						{/* Tasks Card */}
						<TouchableOpacity style={styles.menuCard} onPress={navigateToTasks}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#e8f5e9" }]}>
								<MaterialIcons name='assignment' size={32} color='#4caf50' />
							</View>
							<Text style={styles.menuCardTitle}>Tasks</Text>
							<Text style={styles.menuCardSubtitle}>
								Create & manage assignments
							</Text>
						</TouchableOpacity>

						{/* Submissions Card */}
						<TouchableOpacity
							style={styles.menuCard}
							onPress={navigateToSubmissions}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#fff8e1" }]}>
								<FontAwesome5
									name='clipboard-check'
									size={28}
									color='#ffa000'
								/>
							</View>
							<Text style={styles.menuCardTitle}>Submissions</Text>
							<Text style={styles.menuCardSubtitle}>Review & grade work</Text>
						</TouchableOpacity>

						{/* Analytics Card */}
						<TouchableOpacity style={styles.menuCard}>
							<View
								style={[styles.iconContainer, { backgroundColor: "#f3e5f5" }]}>
								<Ionicons name='analytics' size={32} color='#9c27b0' />
							</View>
							<Text style={styles.menuCardTitle}>Analytics</Text>
							<Text style={styles.menuCardSubtitle}>Performance insights</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f7",
	},
	logoutButton: {
		marginLeft: -15,
		marginTop: -4,
	},
	content: {
		flex: 1,
		padding: 20,
	},
	header: {
		marginBottom: 25,
	},
	welcomeText: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#333",
	},
	emailText: {
		fontSize: 16,
		color: "#666",
		marginTop: 5,
	},
	menuSection: {
		marginBottom: 30,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 15,
	},
	seeAllText: {
		color: "#3f51b5",
		fontWeight: "600",
	},
	menuGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	menuCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 20,
		width: "48%",
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
	},
	iconContainer: {
		width: 60,
		height: 60,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12,
	},
	menuCardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 6,
	},
	menuCardSubtitle: {
		fontSize: 14,
		color: "#666",
		lineHeight: 20,
	},
	activitySection: {
		marginBottom: 30,
	},
	activityList: {
		backgroundColor: "white",
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
	},
	activityItem: {
		flexDirection: "row",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	activityIcon: {
		width: 40,
		height: 40,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 15,
	},
	activityContent: {
		flex: 1,
	},
	activityTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
	},
	activityDetails: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	activityTime: {
		fontSize: 12,
		color: "#999",
		marginTop: 5,
	},
});
