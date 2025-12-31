import { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Default: localhost para web, vacío para móvil (requiere configurar)
const DEFAULT_API_URL = Platform.OS === 'web' ? 'http://localhost:3000' : '';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showSettings, setShowSettings] = useState(!DEFAULT_API_URL);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !apiUrl) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });
        
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { 
            role: 'assistant', 
            content: assistantContent 
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error: No se pudo obtener respuesta' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, apiUrl]);

  const saveSettings = () => {
    setApiUrl(tempApiUrl);
    setShowSettings(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Configuración</Text>
            <Text style={styles.modalLabel}>URL de la API:</Text>
            <TextInput
              style={styles.modalInput}
              value={tempApiUrl}
              onChangeText={setTempApiUrl}
              placeholder="http://tu-ip:3000"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.modalHint}>
              Ingresa la IP de tu computador (ej: http://192.168.1.100:3000)
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={saveSettings}>
              <Text style={styles.modalButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerText}>Chat IA</Text>
        <TouchableOpacity onPress={() => { setTempApiUrl(apiUrl); setShowSettings(true); }}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && (
          <Text style={styles.placeholder}>Inicia una conversación...</Text>
        )}
        {messages.map((msg, i) => (
          <View 
            key={i} 
            style={[
              styles.message, 
              msg.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={msg.role === 'user' ? styles.userText : styles.assistantText}>
              {msg.content || '...'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje..."
          onSubmitEditing={sendMessage}
          editable={!isLoading}
        />
        <TouchableOpacity 
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    backgroundColor: '#12121a',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#00f5ff33',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: '#00f5ff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: '#00f5ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  settingsIcon: {
    fontSize: 24,
  },
  messages: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    gap: 16,
  },
  placeholder: {
    textAlign: 'center',
    color: '#00f5ff66',
    marginTop: 40,
    fontSize: 16,
    letterSpacing: 1,
  },
  message: {
    padding: 14,
    borderRadius: 16,
    maxWidth: '85%',
    borderWidth: 1,
  },
  userMessage: {
    backgroundColor: '#1a1a2e',
    alignSelf: 'flex-end',
    borderColor: '#ff00ff55',
    shadowColor: '#ff00ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  assistantMessage: {
    backgroundColor: '#1a1a2e',
    alignSelf: 'flex-start',
    borderColor: '#00f5ff55',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  userText: {
    color: '#ff88ff',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    color: '#88ffff',
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#12121a',
    borderTopWidth: 1,
    borderTopColor: '#00f5ff33',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#00f5ff44',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
  },
  sendButton: {
    backgroundColor: '#00f5ff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#333344',
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: '#0a0a0f',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#00f5ff33',
  },
  modalTitle: {
    color: '#00f5ff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#00f5ff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#0a0a0f',
    fontSize: 16,
    fontWeight: '700',
  },
});
