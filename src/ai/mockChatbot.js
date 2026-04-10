/**
 * Mock Chatbot Service - Works Without API
 * Returns intelligent responses based on keywords and context
 * Perfect for demos, testing, and offline usage
 */

class MockChatbotService {
  constructor() {
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
    
    // Response templates for different topics
    this.responses = {
      greetings: [
        "Hi there! Welcome to CampusPulse! I'm here to help you discover amazing campus events. What would you like to know?",
        "Hey! I'm your campus events assistant. Need help finding events, registering, or learning about clubs?",
        "Welcome! I'm powered by AI to help you navigate campus events. How can I assist you?"
      ],
      events: [
        "Our platform has hundreds of student events! You can browse by category, date, or club. What type of events interest you?",
        "We have events for every interest - sports, arts, tech, culture, and more! Would you like me to suggest some?",
        "Check our calendar for upcoming events. You can filter by club, time, or category. What are you interested in?"
      ],
      registration: [
        "To register for an event, just click the 'Register' button on the event page. It takes 30 seconds!",
        "Registration is easy - browse events, click register, and you're all set! You'll get a confirmation email.",
        "You can manage all your registrations in your Student Dashboard. Need help finding specific events?"
      ],
      clubs: [
        "Clubs organize amazing events on campus! Browse clubs by category or search for specific ones.",
        "Join a club to get involved and stay updated on their events. We have clubs for every interest!",
        "Club officers can create and manage their events through the Club Dashboard. Are you a club member?"
      ],
      calendar: [
        "Our interactive calendar shows all upcoming events. You can view by date, filter by club, or see your registrations.",
        "Check the calendar page to see events visually organized by date. It's the best way to plan your week!",
        "The calendar syncs with Google Calendar if you want to track events there too!"
      ],
      help: [
        "Here's what I can help with: finding events, learning about registration, discovering clubs, or navigating the calendar.",
        "I can assist with: browsing events, registering for activities, joining clubs, or using our calendar.",
        "What do you need help with? I can help with events, registration, clubs, or calendar features."
      ]
    };

    this.keywords = {
      event: ['event', 'events', 'happening', 'activity', 'activities', 'program', 'workshop', 'class'],
      register: ['register', 'registration', 'register for', 'join', 'sign up', 'enroll'],
      club: ['club', 'clubs', 'organization', 'society', 'group', 'team'],
      calendar: ['calendar', 'date', 'schedule', 'time', 'when', 'upcoming'],
      hello: ['hi', 'hello', 'hey', 'greetings', 'start', 'begin'],
      help: ['help', 'assist', 'support', 'guide', 'how do i', 'how to', 'what can you']
    };
  }

  /**
   * Send a message and get a mock response
   */
  async chat(userId, message, context = '') {
    try {
      // Store conversation history
      this.addToHistory(userId, { role: 'user', content: message });

      // Analyze message to determine topic
      const topic = this.analyzeTopic(message);
      const responses = this.responses[topic] || this.responses.help;
      
      // Get random response for variety
      const response = responses[Math.floor(Math.random() * responses.length)];

      // Add slight delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

      // Store response in history
      this.addToHistory(userId, { role: 'assistant', content: response });

      return response;
    } catch (error) {
      console.error('Mock chatbot error:', error);
      return 'Sorry, I encountered an issue. Please try again!';
    }
  }

  /**
   * Analyze message to determine topic
   */
  analyzeTopic(message) {
    const lowerMessage = message.toLowerCase();

    for (const [topic, keywords] of Object.entries(this.keywords)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          return topic;
        }
      }
    }

    return 'help'; // Default topic
  }

  /**
   * Get suggested questions for a context
   */
  getSuggestedQuestions(context) {
    const suggestions = {
      dashboard: [
        'What events are happening today?',
        'How do I register for an event?',
        'Show me events by club',
        'Tell me about the calendar'
      ],
      events: [
        'What type of events do you have?',
        'How do I join a club?',
        'Can I export events to calendar?',
        'Are there events this weekend?'
      ],
      help: [
        'How do I use this platform?',
        'What can you help me with?',
        'Show me upcoming events',
        'How do I create an account?'
      ]
    };

    return suggestions[context] || suggestions.dashboard;
  }

  /**
   * Add message to conversation history
   */
  addToHistory(userId, message) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    history.push(message);

    // Keep only last 10 messages
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Clear conversation
   */
  clearConversation(userId) {
    this.conversationHistory.delete(userId);
  }
}

export default new MockChatbotService();
