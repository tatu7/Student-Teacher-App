import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { icons } from "../constants/icons";

export default function Hujjatlar() {
  const buttons = [
    {
      id: 5,
      title: "Normativ huquqiy hujjatlar",
      url: "https://lex.uz/uz/",
      icon: "document-text-outline",
    },
    {
      id: 1,
      title: "Birinchi tibbiy yordam",
      url: "https://lex.uz/uz/",
      icon: "medkit-outline",
    },
    {
      id: 2,
      title: "Yong'in avtomatikasi",
      url: "https://lex.uz/uz/",
      icon: "flame-outline",
    },
    {
      id: 3,
      title: "Birlamchi yongʻin oʻchirish vositalari",
      url: "https://lex.uz/uz/",
      icon: icons.img_1,
    },
    {
      id: 4,
      title: "Mavzulashtirilgan profilaktik davra suhbatlar",
      url: "https://lex.uz/uz/",
      icon: "people-outline",
    },
    {
      id: 6,
      title: "Ma'lumotlar bazasi",
      url: "https://lex.uz/uz/",
      icon: "server-outline",
    },
    {
      id: 7,
      title: "Jismoniy mashq me'yorlari",
      url: "https://lex.uz/uz/",
      icon: "fitness-outline",
    },
    {
      id: 8,
      title: "O't otish tayyorgarligi",
      url: "https://lex.uz/uz/",
      icon: icons.img_2,
    },
  ];

  const handleButtonPress = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Ensiklopediya</Text>
      </View>

      <TouchableOpacity
        style={styles.lexButton}
        onPress={() => handleButtonPress('https://lex.uz/uz/')}
      >
        <Ionicons name="link-outline" size={24} color="#FFFFFF" />
        <Text style={styles.lexButtonText}>Lex.uz</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.buttonContainer}>
          {buttons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={styles.button}
              onPress={() => handleButtonPress(button.url)}
            >
              <View style={styles.buttonContent}>
                {typeof button.icon === 'string' ? (
                  <Ionicons name={button.icon} size={24} color="#007AFF" style={styles.buttonIcon} />
                ) : (
                  <Image source={button.icon} style={[styles.buttonIcon, { width: 32, height: 26 }]} />
                )}
                <Text style={styles.buttonText}>{button.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  lexButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lexButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
}); 