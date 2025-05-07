import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function Musobaqa() {
  const [selectedLevel, setSelectedLevel] = useState("yosh");
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Example test questions
  const testQuestions = [
    {
      question: "Tekshiruv jarayonida qanday hujjatlar talab qilinadi?",
      options: [
        "Faqat pasport",
        "Pasport va ruxsatnoma",
        "Pasport, ruxsatnoma va texnik pasport",
      ],
    },
    {
      question: "Tekshiruv vaqtida qanday asboblar ishlatiladi?",
      options: [
        "Faqat vizual tekshiruv",
        "Vizual tekshiruv va asboblar",
        "Faqat asboblar",
      ],
    },
    // Add more questions as needed
  ];

  const levels = [
    {
      id: "yosh",
      title: "Yosh Inspektor",
      description: "Boshlang'ich daraja",
      icon: "star-outline",
      color: "#4CAF50",
      tests: Array(10).fill().map((_, i) => ({
        id: i + 1,
        title: `Test ${i + 1}`,
        questions: 20,
        time: "30 daqiqa",
        completed: i < 3,
      })),
    },
    {
      id: "inspektor",
      title: "Inspektor",
      description: "O'rta daraja",
      icon: "star-half-outline",
      color: "#FF9800",
      tests: Array(10).fill().map((_, i) => ({
        id: i + 1,
        title: `Test ${i + 1}`,
        questions: 25,
        time: "45 daqiqa",
        completed: false,
      })),
    },
    {
      id: "katta",
      title: "Katta Inspektor",
      description: "Yuqori daraja",
      icon: "star",
      color: "#F44336",
      tests: Array(10).fill().map((_, i) => ({
        id: i + 1,
        title: `Test ${i + 1}`,
        questions: 30,
        time: "60 daqiqa",
        completed: false,
      })),
    },
  ];

  const currentLevel = levels.find(level => level.id === selectedLevel);

  const LevelCard = ({ level }) => (
    <TouchableOpacity
      style={[
        styles.levelCard,
        selectedLevel === level.id && styles.selectedLevelCard,
        { borderColor: level.color },
      ]}
      onPress={() => setSelectedLevel(level.id)}
    >
      <View style={styles.levelHeader}>
        <Ionicons name={level.icon} size={20} color={level.color} />
        <Text style={[styles.levelTitle, { color: level.color }]}>{level.title}</Text>
      </View>
      <Text style={styles.levelDescription}>{level.description}</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(level.tests.filter(t => t.completed).length / level.tests.length) * 100}%`,
                backgroundColor: level.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {level.tests.filter(t => t.completed).length}/{level.tests.length}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const TestCard = ({ test, levelColor }) => (
    <TouchableOpacity style={styles.testCard}>
      <View style={styles.testHeader}>
        <View style={[styles.testIcon, { backgroundColor: `${levelColor}20` }]}>
          <Ionicons name="document-text-outline" size={20} color={levelColor} />
        </View>
        <View style={styles.testInfo}>
          <Text style={styles.testTitle}>{test.title}</Text>
          <View style={styles.testDetails}>
            <View style={styles.testDetail}>
              <Ionicons name="help-circle-outline" size={16} color="#666" />
              <Text style={styles.testDetailText}>{test.questions} savol</Text>
            </View>
            <View style={styles.testDetail}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.testDetailText}>{test.time}</Text>
            </View>
          </View>
        </View>
        {test.completed ? (
          <View style={[styles.statusBadge, { backgroundColor: `${levelColor}20` }]}>
            <Ionicons name="checkmark-circle" size={20} color={levelColor} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: levelColor }]}
            onPress={() => setSelectedTest(test)}
          >
            <Text style={styles.startButtonText}>Boshlash</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const TestModal = () => (
    <Modal
      visible={selectedTest !== null}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSelectedTest(null)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedTest?.title}</Text>
            <TouchableOpacity onPress={() => setSelectedTest(null)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.questionContainer}>
            <Text style={styles.questionNumber}>
              Savol {currentQuestion + 1}/{testQuestions.length}
            </Text>
            <Text style={styles.questionText}>
              {testQuestions[currentQuestion].question}
            </Text>

            {testQuestions[currentQuestion].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionContainer}
                onPress={() => setSelectedAnswer(index.toString())}
              >
                <View style={styles.radioButton}>
                  {selectedAnswer === index.toString() && (
                    <View style={[styles.radioButtonSelected, { backgroundColor: currentLevel.color }]} />
                  )}
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(currentQuestion - 1);
                  setSelectedAnswer(null);
                }
              }}
              disabled={currentQuestion === 0}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
              <Text style={styles.navButtonText}>Oldingi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(currentQuestion + 1);
                  setSelectedAnswer(null);
                } else {
                  // Handle test completion
                  setSelectedTest(null);
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                }
              }}
            >
              <Text style={styles.navButtonText}>
                {currentQuestion < testQuestions.length - 1 ? "Keyingi" : "Yakunlash"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Musobaqalar</Text>
        <Text style={styles.headerSubtitle}>Bilimingizni sinab ko'ring</Text>
      </View>

      <View style={styles.levelsRow}>
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} />
        ))}
      </View>

      <View style={styles.testsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentLevel.title} testlari</Text>
          <Text style={styles.sectionSubtitle}>
            {currentLevel.tests.filter(t => t.completed).length}/{currentLevel.tests.length} test yakunlangan
          </Text>
        </View>

        {currentLevel.tests.map((test) => (
          <TestCard key={test.id} test={test} levelColor={currentLevel.color} />
        ))}
      </View>

      <TestModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  levelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  levelCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  selectedLevelCard: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  levelDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "right",
  },
  testsContainer: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  testCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  testIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  testDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  testDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  testDetailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  prevButton: {
    backgroundColor: "#666",
  },
  nextButton: {
    backgroundColor: "#4CAF50",
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginHorizontal: 8,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
}); 