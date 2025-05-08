import React from "react";
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function TeacherDashboard() {
	const { user, signOut } = useAuth();

	return (
		<View style={styles.container}>
			<Stack.Screen
				options={{
					title: "Teacher Dashboard",
					headerRight: () => (
						<TouchableOpacity onPress={signOut} style={styles.logoutButton}>
							<Ionicons name='log-out-outline' size={24} color='#007AFF' />
						</TouchableOpacity>
					),
				}}
			/>

			<ScrollView style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.welcomeText}>Welcome, Teacher</Text>
					<Text style={styles.emailText}>{user?.email}</Text>
				</View>

				<View style={styles.cardSection}>
					<Text style={styles.sectionTitle}>Your Classes</Text>
					<View style={styles.cardContainer}>
						<View style={styles.card}>
							<Ionicons name='people-outline' size={30} color='#007AFF' />
							<Text style={styles.cardTitle}>Math 101</Text>
							<Text style={styles.cardSubtitle}>28 Students</Text>
						</View>

						<View style={styles.card}>
							<Ionicons name='people-outline' size={30} color='#007AFF' />
							<Text style={styles.cardTitle}>Science 202</Text>
							<Text style={styles.cardSubtitle}>24 Students</Text>
						</View>

						<View style={styles.card}>
							<Ionicons name='add-circle-outline' size={30} color='#007AFF' />
							<Text style={styles.cardTitle}>Add New Class</Text>
						</View>
					</View>
				</View>

				<View style={styles.cardSection}>
					<Text style={styles.sectionTitle}>Upcoming Events</Text>
					<View style={styles.eventList}>
						<View style={styles.eventItem}>
							<View style={styles.eventDate}>
								<Text style={styles.eventDateDay}>15</Text>
								<Text style={styles.eventDateMonth}>Nov</Text>
							</View>
							<View style={styles.eventDetails}>
								<Text style={styles.eventTitle}>Math 101 Final Exam</Text>
								<Text style={styles.eventTime}>10:00 AM - 12:00 PM</Text>
							</View>
						</View>

						<View style={styles.eventItem}>
							<View style={styles.eventDate}>
								<Text style={styles.eventDateDay}>18</Text>
								<Text style={styles.eventDateMonth}>Nov</Text>
							</View>
							<View style={styles.eventDetails}>
								<Text style={styles.eventTitle}>
									Science 202 Project Presentation
								</Text>
								<Text style={styles.eventTime}>2:00 PM - 4:00 PM</Text>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	logoutButton: {
		marginRight: 15,
	},
	content: {
		flex: 1,
		padding: 20,
	},
	header: {
		marginBottom: 25,
	},
	welcomeText: {
		fontSize: 24,
		fontWeight: "bold",
	},
	emailText: {
		fontSize: 14,
		color: "#666",
		marginTop: 5,
	},
	cardSection: {
		marginBottom: 25,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 15,
	},
	cardContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	card: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 20,
		width: "48%",
		marginBottom: 15,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginTop: 10,
		textAlign: "center",
	},
	cardSubtitle: {
		fontSize: 14,
		color: "#666",
		marginTop: 5,
	},
	eventList: {
		backgroundColor: "white",
		borderRadius: 12,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	eventItem: {
		flexDirection: "row",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	eventDate: {
		width: 50,
		height: 50,
		borderRadius: 10,
		backgroundColor: "#E8F1FF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 15,
	},
	eventDateDay: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#007AFF",
	},
	eventDateMonth: {
		fontSize: 12,
		color: "#007AFF",
	},
	eventDetails: {
		flex: 1,
		justifyContent: "center",
	},
	eventTitle: {
		fontSize: 16,
		fontWeight: "bold",
	},
	eventTime: {
		fontSize: 14,
		color: "#666",
		marginTop: 5,
	},
});
