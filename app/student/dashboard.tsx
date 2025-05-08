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

export default function StudentDashboard() {
	const { user, signOut } = useAuth();

	return (
		<View style={styles.container}>
			<Stack.Screen
				options={{
					title: "Student Dashboard",
					headerRight: () => (
						<TouchableOpacity onPress={signOut} style={styles.logoutButton}>
							<Ionicons name='log-out-outline' size={24} color='#007AFF' />
						</TouchableOpacity>
					),
				}}
			/>

			<ScrollView style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.welcomeText}>Welcome, Student</Text>
					<Text style={styles.emailText}>{user?.email}</Text>
				</View>

				<View style={styles.cardSection}>
					<Text style={styles.sectionTitle}>Your Classes</Text>
					<View style={styles.classList}>
						<TouchableOpacity style={styles.classItem}>
							<View style={styles.classIcon}>
								<Ionicons name='calculator-outline' size={24} color='#007AFF' />
							</View>
							<View style={styles.classDetails}>
								<Text style={styles.classTitle}>Math 101</Text>
								<Text style={styles.classTeacher}>Prof. Johnson</Text>
							</View>
							<Ionicons name='chevron-forward' size={20} color='#ccc' />
						</TouchableOpacity>

						<TouchableOpacity style={styles.classItem}>
							<View style={styles.classIcon}>
								<Ionicons name='flask-outline' size={24} color='#007AFF' />
							</View>
							<View style={styles.classDetails}>
								<Text style={styles.classTitle}>Science 202</Text>
								<Text style={styles.classTeacher}>Prof. Smith</Text>
							</View>
							<Ionicons name='chevron-forward' size={20} color='#ccc' />
						</TouchableOpacity>

						<TouchableOpacity style={styles.classItem}>
							<View style={styles.classIcon}>
								<Ionicons name='book-outline' size={24} color='#007AFF' />
							</View>
							<View style={styles.classDetails}>
								<Text style={styles.classTitle}>Literature 110</Text>
								<Text style={styles.classTeacher}>Prof. Williams</Text>
							</View>
							<Ionicons name='chevron-forward' size={20} color='#ccc' />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.cardSection}>
					<Text style={styles.sectionTitle}>Upcoming Assignments</Text>
					<View style={styles.assignmentList}>
						<View style={styles.assignmentItem}>
							<View
								style={[
									styles.assignmentStatus,
									{ backgroundColor: "#FF9500" },
								]}
							/>
							<View style={styles.assignmentDetails}>
								<Text style={styles.assignmentTitle}>Math Homework #5</Text>
								<Text style={styles.assignmentDue}>Due Tomorrow, 11:59 PM</Text>
							</View>
							<TouchableOpacity style={styles.assignmentAction}>
								<Text style={styles.assignmentActionText}>View</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.assignmentItem}>
							<View
								style={[
									styles.assignmentStatus,
									{ backgroundColor: "#34C759" },
								]}
							/>
							<View style={styles.assignmentDetails}>
								<Text style={styles.assignmentTitle}>Science Lab Report</Text>
								<Text style={styles.assignmentDue}>Due in 3 days</Text>
							</View>
							<TouchableOpacity style={styles.assignmentAction}>
								<Text style={styles.assignmentActionText}>View</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.assignmentItem}>
							<View
								style={[
									styles.assignmentStatus,
									{ backgroundColor: "#AF52DE" },
								]}
							/>
							<View style={styles.assignmentDetails}>
								<Text style={styles.assignmentTitle}>Literature Essay</Text>
								<Text style={styles.assignmentDue}>Due next week</Text>
							</View>
							<TouchableOpacity style={styles.assignmentAction}>
								<Text style={styles.assignmentActionText}>View</Text>
							</TouchableOpacity>
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
	classList: {
		backgroundColor: "white",
		borderRadius: 12,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	classItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	classIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#E8F1FF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 15,
	},
	classDetails: {
		flex: 1,
	},
	classTitle: {
		fontSize: 16,
		fontWeight: "bold",
	},
	classTeacher: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	assignmentList: {
		backgroundColor: "white",
		borderRadius: 12,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	assignmentItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	assignmentStatus: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 15,
	},
	assignmentDetails: {
		flex: 1,
	},
	assignmentTitle: {
		fontSize: 16,
		fontWeight: "bold",
	},
	assignmentDue: {
		fontSize: 14,
		color: "#666",
		marginTop: 2,
	},
	assignmentAction: {
		backgroundColor: "#E8F1FF",
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 15,
	},
	assignmentActionText: {
		color: "#007AFF",
		fontWeight: "bold",
		fontSize: 14,
	},
});
