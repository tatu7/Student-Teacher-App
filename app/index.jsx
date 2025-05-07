import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Pressable } from "react-native";
import { Calendar, CalendarList, Agenda } from "react-native-calendars";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function Kalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState({});
  const [newTask, setNewTask] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [taskDescription, setTaskDescription] = useState("");

  const addTask = () => {
    if (taskDescription.trim() === "" || !selectedStatus) return;

    const updatedTasks = {
      ...tasks,
      [selectedDate]: [...(tasks[selectedDate] || []), {
        text: taskDescription,
        status: selectedStatus
      }]
    };

    setTasks(updatedTasks);
    setTaskDescription("");
    setSelectedStatus(null);
    setModalVisible(false);
  };

  const removeTask = (date, index) => {
    const updatedTasks = {
      ...tasks,
      [date]: tasks[date].filter((_, i) => i !== index)
    };

    if (updatedTasks[date].length === 0) {
      delete updatedTasks[date];
    }

    setTasks(updatedTasks);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Muhim":
        return "#FF3B30";
      case "O'rta":
        return "#FFCC00";
      case "Yengil":
        return "#34C759";
      default:
        return "#007AFF";
    }
  };

  const markedDates = Object.keys(tasks).reduce((acc, date) => {
    const hasTasks = tasks[date].length > 0;
    const status = tasks[date][0]?.status;

    acc[date] = {
      marked: hasTasks,
      dotColor: getStatusColor(status),
      selected: date === selectedDate,
      selectedColor: "#007AFF"
    };
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <View style={styles.calendarContainer}>
        <Calendar
          style={styles.calendar}
          theme={{
            backgroundColor: "#FFFFFF",
            calendarBackground: "#FFFFFF",
            textSectionTitleColor: "#8E8E93",
            selectedDayBackgroundColor: "#007AFF",
            selectedDayTextColor: "#FFFFFF",
            todayTextColor: "#007AFF",
            dayTextColor: "#000000",
            textDisabledColor: "#D9D9D9",
            dotColor: "#007AFF",
            selectedDotColor: "#FFFFFF",
            arrowColor: "#007AFF",
            monthTextColor: "#000000",
            textMonthFontWeight: "bold",
            textDayFontSize: 16,
            textMonthFontSize: 18,
          }}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              selected: true,
              marked: markedDates[selectedDate]?.marked,
              selectedColor: "#007AFF"
            }
          }}
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setModalVisible(true);
          }}
        />
      </View>

      <View style={styles.taskContainer}>
        <Text style={styles.taskTitle}>Vazifalar</Text>
        <ScrollView style={styles.taskList}>
          {Object.keys(tasks).length > 0 ? (
            Object.entries(tasks).map(([date, dateTasks]) => (
              <View key={date}>
                {dateTasks.map((task, index) => (
                  <View
                    key={index}
                    style={[
                      styles.taskItem,
                      { borderLeftColor: getStatusColor(task.status) }
                    ]}
                  >
                    <View style={styles.taskContent}>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskText}>{task.text}</Text>
                        <Text style={styles.taskDate}>
                          {new Date(date).toLocaleDateString('uz-UZ', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                        <Text style={styles.statusText}>{task.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeTask(date, index)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyStateText}>Vazifalar yo'q</Text>
              <Text style={styles.emptyStateSubText}>Vazifa qo'shish uchun kalendardan kunni tanlang</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yangi vazifa qo'shish</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Vazifa nomi..."
              value={taskDescription}
              onChangeText={setTaskDescription}
            />

            <Text style={styles.statusTitle}>Status</Text>
            <View style={styles.statusContainer}>
              {["Muhim", "O'rta", "Yengil"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedStatus === status && {
                      backgroundColor: getStatusColor(status),
                      borderColor: getStatusColor(status),
                    }
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    selectedStatus === status && styles.statusOptionTextSelected
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addTask}
              >
                <Text style={styles.saveButtonText}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  calendarContainer: {
    margin: 20,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  calendar: {
    borderRadius: 15,
    padding: 10,
  },
  taskContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#000000",
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  taskContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskInfo: {
    flex: 1,
    marginRight: 10,
  },
  taskText: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  deleteButton: {
    padding: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statusOption: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginHorizontal: 5,
    alignItems: "center",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#000000",
  },
  statusOptionTextSelected: {
    color: "#FFFFFF",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#000000",
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

