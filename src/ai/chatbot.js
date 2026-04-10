/**
 * AI Chatbot Service
 * Handles conversational AI for event management assistance
 * Supports OpenAI, Google Gemini, and Mock (offline) modes
 */

import aiConfig from './aiConfig';
import mockChatbot from './mockChatbot';

class ChatbotService {
  constructor() {
    this.conversationHistory = new Map(); // Track conversations per user
    this.maxHistoryLength = 10; // Keep last 10 messages for context
  }

  /**
   * Send a message to the chatbot
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @param {string} context - Optional additional context (user profile, events data)
   * @returns {Promise<string>} - AI response
   */
  async chat(userId, message, context = '') {
    try {
      // Check rate limit
      if (!aiConfig.checkRateLimit('chatbot', userId)) {
        return 'I\'m processing a lot of requests right now. Please wait a moment and try again.';
      }

      // Get conversation history for context
      const conversationHistory = this.getConversationHistory(userId);

      // Route to appropriate provider
      if (aiConfig.aiProvider === 'mock') {
        // Use mock chatbot for offline/demo mode
        return await mockChatbot.chat(userId, message, context);
      } else if (aiConfig.aiProvider === 'openai' && aiConfig.openaiKey) {
        return await this.openaiChat(userId, message, conversationHistory, context);
      } else if (aiConfig.aiProvider === 'gemini' && aiConfig.geminiKey) {
        return await this.geminiChat(userId, message, conversationHistory, context);
      } else if (!aiConfig.openaiKey && !aiConfig.geminiKey) {
        // Auto-fallback to mock if no APIs configured
        console.warn('No AI APIs configured, using mock chatbot');
        return await mockChatbot.chat(userId, message, context);
      }

      return 'AI service is currently unavailable.';
    } catch (error) {
      console.error('Chatbot error:', error);
      // Fallback to mock on error
      if (error.message.includes('API') || error.message.includes('key')) {
        return await mockChatbot.chat(userId, message, context);
      }
      return 'Sorry, I encountered an error. Please try again later.';
    }
  }

  /**
   * Send message to OpenAI API
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @param {Array} history - Conversation history
   * @param {string} context - Additional context
   * @returns {Promise<string>} - AI response
   */
  async openaiChat(userId, message, history, context) {
    try {
      const headers = aiConfig.getApiHeaders();
      const endpoint = aiConfig.getApiEndpoint('chat');

      // Build messages array
      const messages = [
        { role: 'system', content: aiConfig.getSystemPrompt('chatbot') },
        ...history,
        { role: 'user', content: context ? `${context}\n\nUser: ${message}` : message }
      ];

      const payload = {
        model: aiConfig.getModel(false),
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || 'I couldn\'t generate a response.';

      // Store conversation history
      this.addToHistory(userId, {
        role: 'user',
        content: message
      });
      this.addToHistory(userId, {
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error) {
      console.error('OpenAI error:', error);
      throw error;
    }
  }

  /**
   * Send message to Google Gemini API
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @param {Array} history - Conversation history
   * @param {string} context - Additional context
   * @returns {Promise<string>} - AI response
   */
  async geminiChat(userId, message, history, context) {
    try {
      const endpoint = aiConfig.getApiEndpoint('chat');

      // Convert history to Gemini format
      const parts = [];
      
      // Add system prompt as initial message
      parts.push({
        text: aiConfig.getSystemPrompt('chatbot')
      });

      // Add history
      history.forEach(msg => {
        parts.push({
          text: `${msg.role}: ${msg.content}`
        });
      });

      // Add current message
      const userMessage = context ? `${context}\n\nUser: ${message}` : message;
      parts.push({
        text: `user: ${userMessage}`
      });

      const payload = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 500
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                               'I couldn\'t generate a response.';

      // Store conversation history
      this.addToHistory(userId, {
        role: 'user',
        content: message
      });
      this.addToHistory(userId, {
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error) {
      console.error('Gemini error:', error);
      throw error;
    }
  }

  /**
   * Get or initialize conversation history for a user
   * @param {string} userId - User ID
   * @returns {Array} - Conversation history
   */
  getConversationHistory(userId) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId);
  }

  /**
   * Add message to conversation history
   * @param {string} userId - User ID
   * @param {Object} message - Message object { role: 'user' | 'assistant', content: string }
   */
  addToHistory(userId, message) {
    const history = this.getConversationHistory(userId);
    history.push(message);

    // Keep only recent history to avoid token limits
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - User ID
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  /**
   * Get pre-defined response when AI is not available
   * @param {string} userMessage - User's message
   * @returns {string} - Default response
   */
  getDefaultResponse(message) {
    // Simple intent matching for common queries
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('event') || lowerMessage.includes('register')) {
      return 'I can help you find and register for events! Try asking about specific event types, clubs, or dates.';
    }

    if (lowerMessage.includes('club')) {
      return 'I can provide information about different clubs and their events. Which club are you interested in?';
    }

    if (lowerMessage.includes('recommendation') || lowerMessage.includes('suggest')) {
      return 'I can recommend events based on your interests. Tell me what types of events you enjoy!';
    }

    if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
      return 'I can help you find events at specific locations. What location are you interested in?';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return 'I\'m here to help! Ask me about events, clubs, registration, recommendations, or any other questions about the platform.';
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! Welcome to the College Event Management System. How can I help you today?';
    }

    return 'Thanks for your question! I can help you with event information, recommendations, registration, and more. What would you like to know?';
  }

  /**
   * Get suggested questions for the user
   * @param {string} context - Current context ('dashboard', 'events', 'profile')
   * @returns {Array} - Array of suggested questions
   */
  getSuggestedQuestions(context = 'dashboard') {
    // If using mock mode, get suggestions from mock
    if (aiConfig.aiProvider === 'mock' || !aiConfig.isConfigured()) {
      return mockChatbot.getSuggestedQuestions(context);
    }

    const questions = {
      dashboard: [
        'What events would you recommend for me?',
        'Show me events from my favorite clubs',
        'How do I register for an event?'
      ],
      events: [
        'Tell me more about this event',
        'What\'s the skill level required?',
        'How many people are registered?'
      ],
      profile: [
        'Update my event preferences',
        'Show my past events',
        'Suggest events based on my interests'
      ]
    };

    return questions[context] || questions.dashboard;
  }

  /**
   * Extract intent and entities from user message (basic NLP)
   * @param {string} message - User message
   * @returns {Object} - { intent, entities }
   */
  parseUserMessage(message) {
    const lowerMessage = message.toLowerCase();
    let intent = 'general_query';
    const entities = [];

    // Intent detection
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      intent = 'get_recommendations';
    } else if (lowerMessage.includes('register') || lowerMessage.includes('join')) {
      intent = 'register_event';
    } else if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
      intent = 'search_events';
    } else if (lowerMessage.includes('club')) {
      intent = 'club_info';
    } else if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
      intent = 'location_search';
    }

    // Entity extraction (basic)
    const datePatterns = /([0-9]{1,2}[/-][0-9]{1,2}|today|tomorrow|next\s+week)/gi;
    const dateMatches = message.match(datePatterns);
    if (dateMatches) entities.push({ type: 'date', values: dateMatches });

    const clubPatterns = /club|squad/gi;
    if (clubPatterns.test(message)) entities.push({ type: 'club' });

    return { intent, entities };
  }

  /**
   * Get context string for chatbot based on user data
   * @param {Object} userData - User profile data
   * @param {Array} upcomingEvents - User's upcoming registered events
   * @returns {string} - Context string
   */
  buildContext(userData, upcomingEvents = []) {
    let context = '';

    if (userData) {
      context += `User: ${userData.name}, Role: ${userData.role}\n`;
      if (userData.skillLevel) {
        context += `Skill Level: ${userData.skillLevel}\n`;
      }
    }

    if (upcomingEvents && upcomingEvents.length > 0) {
      context += `Upcoming events: ${upcomingEvents.map(e => e.name).join(', ')}\n`;
    }

    return context;
  }
}

export default new ChatbotService();
