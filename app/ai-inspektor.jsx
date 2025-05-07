import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, SafeAreaView, Modal, Pressable, Alert } from "react-native";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gemini API configuration
const API_KEY = "AIzaSyBkTE7Skc2LqkF8Umy6cJippUYfBzkZHpk"; // Get it from https://makersuite.google.com/app/apikey
const genAI = new GoogleGenerativeAI(API_KEY);

export default function AIInspektor() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chatName, setChatName] = useState("");
  const [savedChats, setSavedChats] = useState([]);
  const savedChatsRef = useRef([]);
  const scrollViewRef = useRef();

  // Load saved chats on component mount
  useEffect(() => {
    loadSavedChats();
  }, []);

  const loadSavedChats = async () => {
    try {
      console.log('Loading saved chats...');
      const chats = await AsyncStorage.getItem('savedChats');
      console.log('Raw chats from storage:', chats);

      if (chats) {
        try {
          const parsedChats = JSON.parse(chats);
          console.log('Parsed chats:', JSON.stringify(parsedChats, null, 2));

          if (Array.isArray(parsedChats)) {
            const processedChats = parsedChats.map(chat => ({
              ...chat,
              messages: chat.messages.map(msg => ({
                text: msg.text,
                sender: msg.sender
              }))
            }));
            console.log('Processed chats:', JSON.stringify(processedChats, null, 2));
            savedChatsRef.current = processedChats;
            setSavedChats(processedChats);
          } else {
            console.error('Parsed chats is not an array:', parsedChats);
            savedChatsRef.current = [];
            setSavedChats([]);
          }
        } catch (parseError) {
          console.error('Error parsing chats:', parseError);
          savedChatsRef.current = [];
          setSavedChats([]);
        }
      } else {
        console.log('No chats found in storage');
        savedChatsRef.current = [];
        setSavedChats([]);
      }
    } catch (error) {
      console.error('Error loading saved chats:', error);
      savedChatsRef.current = [];
      setSavedChats([]);
    }
  };

  const saveChat = async () => {
    if (!chatName.trim()) {
      Alert.alert("Xatolik", "Iltimos, chat nomini kiriting!");
      return;
    }

    try {
      const newChat = {
        id: Date.now().toString(),
        name: chatName,
        messages: [...messages],
        date: new Date().toISOString()
      };

      const updatedChats = [...savedChatsRef.current, newChat];
      await AsyncStorage.setItem('savedChats', JSON.stringify(updatedChats));

      savedChatsRef.current = updatedChats;
      setSavedChats(updatedChats);
      setShowSaveModal(false);
      setChatName("");
      Alert.alert("Muvaffaqiyatli", "Chat muvaffaqiyatli saqlandi!");
    } catch (error) {
      console.error('Error saving chat:', error);
      Alert.alert("Xatolik", "Chatni saqlashda xatolik yuz berdi!");
    }
  };

  const loadChat = (chat) => {
    setMessages(chat.messages);
    setShowHistoryModal(false);
  };

  const deleteChat = async (chatId) => {
    try {
      const updatedChats = savedChatsRef.current.filter(chat => chat.id !== chatId);
      await AsyncStorage.setItem('savedChats', JSON.stringify(updatedChats));

      savedChatsRef.current = updatedChats;
      setSavedChats(updatedChats);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const sendMessageToGemini = async (message, chatHistory) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Chat tarixini tayyorlash
      const history = chatHistory.map(msg => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      // Yangi xabarni qo'shish
      history.push({
        role: "user",
        parts: [{ text: message }]
      });

      const chat = model.startChat({
        history: history,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error:', error);
      return 'Kechirasiz, xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = { text: inputText, sender: "user" };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(inputText, messages);
      const aiMessage = {
        text: response || "Kechirasiz, javob topilmadi.",
        sender: "ai"
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        text: "Kechirasiz, xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        sender: "ai"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    const isChatSaved = savedChatsRef.current.some(chat =>
      chat.messages.length === messages.length &&
      chat.messages.every((msg, index) =>
        msg.text === messages[index].text &&
        msg.sender === messages[index].sender
      )
    );

    if (messages.length > 0 && !isChatSaved) {
      Alert.alert(
        "Yangi Chat",
        "Joriy chat saqlanmagan. Yangi chat ochishdan oldin joriy chatni saqlashni xohlaysizmi?",
        [
          {
            text: "Yo'q",
            onPress: () => {
              setMessages([]);
              setInputText("");
            },
            style: "cancel"
          },
          {
            text: "Ha",
            onPress: () => {
              setShowSaveModal(true);
            }
          }
        ]
      );
    } else {
      setMessages([]);
      setInputText("");
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={startNewChat}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>AI Inspektor</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSaveModal(true)}
        >
          <Ionicons name="save-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.sender === "user" ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <Text style={styles.messageText}>Javob kutilmoqda...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Savolingizni yozing..."
            placeholderTextColor="#999"
            multiline
            onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={isLoading}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat Tarixi</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.chatList}>
              {savedChats.map((chat) => (
                <View key={chat.id} style={styles.chatItem}>
                  <TouchableOpacity
                    style={styles.chatItemContent}
                    onPress={() => loadChat(chat)}
                  >
                    <Text style={styles.chatName}>{chat.name}</Text>
                    <Text style={styles.chatDate}>
                      {new Date(chat.date).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteChat(chat.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSaveModal}
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chatni Saqlash</Text>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.nameInput}
              value={chatName}
              onChangeText={setChatName}
              placeholder="Chat nomini kiriting..."
              placeholderTextColor="#999"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveButton, !chatName.trim() && styles.saveButtonDisabled]}
              onPress={saveChat}
              disabled={!chatName.trim()}
            >
              <Text style={styles.saveButtonText}>Saqlash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 100, // Increased padding for bottom tabs
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    color: "#fff"
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginBottom: Platform.OS === "ios" ? 0 : 60, // Add margin for bottom tabs
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  chatItemContent: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  chatDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  nameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 