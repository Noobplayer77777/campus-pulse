/**
 * useChatbot - Custom hook for AI chatbot interactions
 * Manages conversation state and message handling
 */

import { useState, useCallback, useRef } from 'react';
import chatbotService from '../ai/chatbot';
import { useAuth } from './useAuth';

export const useChatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'Hello! I\'m here to help with event management. What can I help you with today?',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  /**
   * Get user ID or generate guest ID
   */
  const getUserId = useCallback(() => {
    if (user?.uid) {
      return user.uid;
    }
    // Generate guest ID if not authenticated
    let guestId = localStorage.getItem('guestChatbotId');
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestChatbotId', guestId);
    }
    return guestId;
  }, [user]);

  /**
   * Send message to chatbot and get response
   */
  const sendMessage = useCallback(async (userMessage, context = '') => {
    if (!userMessage.trim()) {
      return;
    }

    const userId = getUserId();

    // Add user message to conversation
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      // Get response from chatbot
      const response = await chatbotService.chat(userId, userMessage, context);

      // Add assistant response
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Failed to get response from chatbot';
      setError(errorMessage);
      console.error('Error sending message:', err);

      // Add error message to conversation
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  /**
   * Clear conversation history
   */
  const clearMessages = useCallback(() => {
    if (user?.uid) {
      chatbotService.clearHistory(user.uid);
    }
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat cleared! Let\'s start fresh. What would you like to know?',
        timestamp: new Date()
      }
    ]);
    setError(null);
  }, [user?.uid]);

  /**
   * Get suggested questions for current context
   */
  const getSuggestedQuestions = useCallback((context = 'dashboard') => {
    return chatbotService.getSuggestedQuestions(context);
  }, []);

  /**
   * Send suggested question
   */
  const sendSuggestion = useCallback((suggestion) => {
    return sendMessage(suggestion);
  }, [sendMessage]);

  /**
   * Parse user message for intent
   */
  const parseMessage = useCallback((message) => {
    return chatbotService.parseUserMessage(message);
  }, []);

  /**
   * Scroll to latest message
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Toggle chatbot visibility
   */
  const toggleChatbot = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    messages,
    loading,
    error,
    isOpen,
    sendMessage,
    clearMessages,
    getSuggestedQuestions,
    sendSuggestion,
    parseMessage,
    scrollToBottom,
    toggleChatbot,
    messagesEndRef
  };
};
