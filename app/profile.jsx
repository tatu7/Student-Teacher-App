import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Switch, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function Profile() {
  // Mock user data
  const user = {
    name: "Olimjon Mavlonov",
    email: "olimjon.mavlonov@gmail.com",
    phone: "+998 90 123 45 67",
    avatar: "https://via.placeholder.com/150",
    stats: {
      inspections: 24,
      reports: 12,
      rating: 4.8,
    },
  };

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("Uzbek");

  const handleGovUzPress = () => {
    Linking.openURL("https://gov.uz/oz/fvv");
  };

  const SettingItem = ({ icon, title, rightComponent }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {rightComponent}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>



      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aloqa ma'lumotlari</Text>
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={24} color="#007AFF" />
          <Text style={styles.infoText}>{user.email}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={24} color="#007AFF" />
          <Text style={styles.infoText}>{user.phone}</Text>
        </View>
      </View>





      {/* Settings Section */}
      <View style={styles.govSection}>
        <View style={styles.govContent}>
          <Ionicons name="shield-checkmark-outline" size={32} color="#007AFF" />
          <Text style={styles.govTitle}>Davlat xizmatlari</Text>
          <Text style={styles.govSubtitle}>Rasmiy davlat xizmatlaridan foydalaning</Text>
        </View>
        <TouchableOpacity style={styles.govButton} onPress={handleGovUzPress}>
          <Text style={styles.govButtonText}>fvv.uz saytiga kirish</Text>
          <Ionicons name="open-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Umumiy</Text>
        <SettingItem
          icon="notifications-outline"
          title="Bildirishnomalar"
          rightComponent={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#E0E0E0", true: "#007AFF" }}
            />
          }
        />
        <SettingItem
          icon="moon-outline"
          title="Qorong'u rejim"
          rightComponent={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#E0E0E0", true: "#007AFF" }}
            />
          }
        />
        <SettingItem
          icon="language-outline"
          title="Til"
          rightComponent={
            <View style={styles.languageContainer}>
              <Text style={styles.languageText}>{language}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          }
        />
      </View>


      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yordam</Text>
        <SettingItem
          icon="help-circle-outline"
          title="Yordam markazi"
          rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
        />
        <SettingItem
          icon="information-circle-outline"
          title="Ilova haqida"
          rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
        />
        <SettingItem
          icon="log-out-outline"
          title="Chiqish"
          rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    alignItems: "center",
    marginTop: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
  },
  email: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  actionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    color: "#333",
  },
  activityTime: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageText: {
    fontSize: 16,
    color: "#666",
    marginRight: 8,
  },
  govSection: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  govContent: {
    alignItems: "center",
    marginBottom: 16,
  },
  govTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  govSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  govButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  govButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
}); 