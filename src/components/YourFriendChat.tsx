// src/components/YourFriendChat.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { sendToComet, ChatMessage } from "../api/cometClient";

const YourFriendChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m Your Friend 🧸. You can tell me whatever you’re comfortable sharing. What’s on your mind right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updatedConversation = [...messages, userMsg];

    setMessages(updatedConversation);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendToComet(updatedConversation);
      const botMsg: ChatMessage = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const fallback: ChatMessage = {
        role: "assistant",
        content:
          "I’m having trouble connecting to my brain right now 😅 but your feelings still matter. You can try again in a bit, or just keep typing what you want to share.",
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating "Your Friend" button */}
      <View pointerEvents="box-none" style={styles.floatingContainer}>
        <TouchableOpacity style={styles.floatingButton} onPress={toggleOpen}>
          <Text style={styles.floatingText}>Your Friend</Text>
        </TouchableOpacity>
      </View>

      {/* Chat modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={toggleOpen}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your Friend</Text>
              <TouchableOpacity onPress={toggleOpen}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              style={styles.messagesList}
              data={messages}
              keyExtractor={(_, index) => String(index)}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bubble,
                    item.role === "user"
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={
                      item.role === "user"
                        ? styles.userText
                        : styles.assistantText
                    }
                  >
                    {item.content}
                  </Text>
                </View>
              )}
            />

            {/* Loading / thinking */}
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>
                  Your Friend is thinking softly...
                </Text>
              </View>
            )}

            {/* Input row */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type anything, no judgment 💛"
                placeholderTextColor="#95a5a6"
                multiline
                value={input}
                onChangeText={setInput}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                disabled={loading}
              >
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 999,
  },
  floatingButton: {
    backgroundColor: "#6C5CE7",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatingText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeText: {
    fontSize: 20,
  },
  messagesList: {
    flexGrow: 0,
    maxHeight: "65%",
    marginBottom: 8,
  },
  bubble: {
    padding: 10,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: "85%",
  },
  userBubble: {
    backgroundColor: "#6C5CE7",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#F1F2F6",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: "#2d3436",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#636e72",
    marginLeft: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#2c3e50",
  },
  sendButton: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default YourFriendChat;