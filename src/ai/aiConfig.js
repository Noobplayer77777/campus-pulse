/**
 * AI Configuration Module
 * Handles API keys and rate limiting for AI services
 */

class AIConfig {
  constructor() {
    this.openaiKey = process.env.REACT_APP_OPENAI_KEY;
    this.geminiKey = process.env.REACT_APP_GEMINI_KEY;
    this.aiProvider = process.env.REACT_APP_AI_PROVIDER || 'openai'; // 'openai' or 'gemini'
    
    // Rate limiting configuration
    this.rateLimits = {
      chatbot: {
        requestsPerMinute: 5,
        requestsPerHour: 60,
        tokens: new Map() // Track requests per user
      },
      recommender: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        tokens: new Map()
      }
    };

    // API endpoints
    this.endpoints = {
      openai: {
        chat: 'https://api.openai.com/v1/chat/completions',
        models: {
          default: 'gpt-4-turbo',
          fast: 'gpt-3.5-turbo'
        }
      },
      gemini: {
        chat: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        models: {
          default: 'gemini-pro',
          fast: 'gemini-pro'
        }
      }
    };

    // Prompt templates
    this.prompts = {
      chatbot: `You are an AI assistant for a college event management system. Help users with:
- Event recommendations based on their interests
- Information about club events
- Registration assistance
- Event scheduling advice
- Technical support for the platform

Keep responses concise (under 200 words), friendly, and helpful.`,
      
      recommender: `Analyze user preferences and event data to generate personalized event recommendations.
Consider:
- User's past event attendance
- Event type preferences
- Time availability
- Club affiliations
- Skill level required

Return top 5 recommended events with reasoning.`
    };

    // Request queues for rate limiting
    this.requestQueues = {
      chatbot: [],
      recommender: []
    };
  }

  /**
   * Check if API keys are configured
   */
  isConfigured() {
    return !!(this.openaiKey || this.geminiKey);
  }

  /**
   * Check rate limit for a service
   * @param {string} service - 'chatbot' or 'recommender'
   * @param {string} userId - User ID for tracking
   * @returns {boolean} - Whether the request is allowed
   */
  checkRateLimit(service, userId) {
    if (!this.rateLimits[service]) {
      console.error(`Unknown service: ${service}`);
      return false;
    }

    const now = Date.now();
    const service_limit = this.rateLimits[service];
    
    if (!service_limit.tokens.has(userId)) {
      service_limit.tokens.set(userId, []);
    }

    const userRequests = service_limit.tokens.get(userId);
    
    // Remove requests older than 1 minute
    const oldRequests = userRequests.filter(time => now - time < 60000);
    
    if (oldRequests.length >= service_limit.requestsPerMinute) {
      return false; // Rate limit exceeded
    }

    // Add current request
    oldRequests.push(now);
    service_limit.tokens.set(userId, oldRequests);
    
    return true;
  }

  /**
   * Get the appropriate model based on provider
   * @param {boolean} fast - Use faster model
   * @returns {string} - Model name
   */
  getModel(fast = false) {
    const provider = this.aiProvider;
    const models = this.endpoints[provider].models;
    return fast ? models.fast : models.default;
  }

  /**
   * Get API headers for the current provider
   * @returns {Object} - Headers for API request
   */
  getApiHeaders() {
    if (this.aiProvider === 'openai') {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      };
    } else if (this.aiProvider === 'gemini') {
      return {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.geminiKey
      };
    }
    return {};
  }

  /**
   * Get the API endpoint for the current provider
   * @param {string} type - 'chat' or other types
   * @returns {string} - API endpoint URL
   */
  getApiEndpoint(type = 'chat') {
    const endpoint = this.endpoints[this.aiProvider][type];
    if (this.aiProvider === 'gemini' && type === 'chat') {
      return `${endpoint}?key=${this.geminiKey}`;
    }
    return endpoint;
  }

  /**
   * Get system prompt for a service
   * @param {string} service - 'chatbot' or 'recommender'
   * @returns {string} - System prompt
   */
  getSystemPrompt(service) {
    return this.prompts[service] || '';
  }

  /**
   * Reset rate limit for testing/admin purposes
   * @param {string} service - 'chatbot' or 'recommender'
   * @param {string} userId - User ID to reset
   */
  resetRateLimit(service, userId) {
    if (this.rateLimits[service]) {
      this.rateLimits[service].tokens.delete(userId);
    }
  }
}

// Export singleton instance
export default new AIConfig();
