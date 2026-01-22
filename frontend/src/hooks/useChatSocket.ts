import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, sendChatMessage, type ChatMessageEvent } from '../services/socket';
import { chatApi } from '../services/api';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export function useChatSocket() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedHistory = useRef(false);

  // Load chat history on mount
  useEffect(() => {
    if (hasLoadedHistory.current) return;
    hasLoadedHistory.current = true;

    const loadHistory = async () => {
      try {
        const res = await chatApi.getHistory({ limit: 50 });
        setMessages(res.data.messages);
      } catch (err) {
        console.error('[Chat] Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  // Listen for new messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (data: ChatMessageEvent) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === data.id)) {
          return prev;
        }
        // Keep only last 100 messages
        const newMessages = [...prev, data];
        if (newMessages.length > 100) {
          return newMessages.slice(-100);
        }
        return newMessages;
      });
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, []);

  // Send message
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;
    sendChatMessage(message);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
  };
}
