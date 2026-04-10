/**
 * Event Recommendation Engine
 * Generates personalized event recommendations using collaborative filtering
 * and content-based filtering approach
 */

import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import aiConfig from './aiConfig';

class RecommendationEngine {
  /**
   * Generate personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations (default: 5)
   * @returns {Promise<Array>} - Array of recommended events with scores
   */
  async getRecommendations(userId, limit = 5) {
    try {
      // Check rate limit
      if (!aiConfig.checkRateLimit('recommender', userId)) {
        throw new Error('Rate limit exceeded. Max 10 requests per minute');
      }

      // Get user profile and history
      const [userProfile, userHistory] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserEventHistory(userId)
      ]);

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get all available events
      const allEvents = await this.getAllEvents();

      if (!allEvents || allEvents.length === 0) {
        return [];
      }

      // Calculate recommendation scores
      const recommendations = allEvents
        .filter(event => !userHistory.some(h => h.eventId === event.id)) // Exclude already registered
        .map(event => ({
          ...event,
          score: this.calculateRecommendationScore(event, userProfile, userHistory)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Add AI-powered reasoning
      const enrichedRecommendations = await this.enrichRecommendationsWithAI(
        recommendations,
        userProfile
      );

      return enrichedRecommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Firestore
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user's event registration history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of registered/attended events
   */
  async getUserEventHistory(userId) {
    try {
      const q = query(
        collection(db, 'registrations'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user history:', error);
      return [];
    }
  }

  /**
   * Fetch all available events
   * @returns {Promise<Array>} - Array of events
   */
  async getAllEvents() {
    try {
      const q = query(
        collection(db, 'events'),
        where('status', '==', 'approved'),
        where('eventDate', '>=', new Date())
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  /**
   * Calculate recommendation score using weighted factors
   * @param {Object} event - Event object
   * @param {Object} userProfile - User profile
   * @param {Array} userHistory - User's registration history
   * @returns {number} - Recommendation score (0-100)
   */
  calculateRecommendationScore(event, userProfile, userHistory) {
    if (!event || !userProfile || !userHistory) {
      return 0;
    }

    let score = 0;

    // 1. Event Type Preference (25 points)
    const preferredEventTypes = this.getPreferredEventTypes(userHistory || []);
    if (preferredEventTypes.includes(event.type)) {
      score += 25;
    }

    // 2. Club Preference (20 points)
    const preferredClubs = this.getPreferredClubs(userHistory || []);
    if (preferredClubs.includes(event.clubId)) {
      score += 20;
    }

    // 3. Time Availability (15 points)
    if (this.isTimeAvailable(event.eventDate, userProfile)) {
      score += 15;
    }

    // 4. Location Proximity (15 points) - if location data available
    if (userProfile.preferredLocation && event.location) {
      score += this.calculateLocationScore(event.location, userProfile.preferredLocation);
    }

    // 5. Skill Level Match (15 points)
    if (this.isSkillLevelMatch(event.skillLevel, userProfile.skillLevel)) {
      score += 15;
    }

    // 6. Popularity/Attendance (10 points)
    if (event.registrationCount > 20) {
      score += 10;
    }

    // 7. Freshness Bonus (5 points) - newer events
    const daysUntilEvent = (event.eventDate - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilEvent > 1 && daysUntilEvent < 30) {
      score += 5;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Extract preferred event types from user history
   * @param {Array} userHistory - User's registration history
   * @returns {Array} - Array of event types
   */
  getPreferredEventTypes(userHistory) {
    const typeCounts = {};
    userHistory.forEach(reg => {
      if (reg.eventType) {
        typeCounts[reg.eventType] = (typeCounts[reg.eventType] || 0) + 1;
      }
    });
    return Object.keys(typeCounts)
      .sort((a, b) => typeCounts[b] - typeCounts[a])
      .slice(0, 3);
  }

  /**
   * Extract preferred clubs from user history
   * @param {Array} userHistory - User's registration history
   * @returns {Array} - Array of club IDs
   */
  getPreferredClubs(userHistory) {
    const clubCounts = {};
    userHistory.forEach(reg => {
      if (reg.clubId) {
        clubCounts[reg.clubId] = (clubCounts[reg.clubId] || 0) + 1;
      }
    });
    return Object.keys(clubCounts)
      .sort((a, b) => clubCounts[b] - clubCounts[a])
      .slice(0, 3);
  }

  /**
   * Check if event time conflicts with user schedule
   * @param {Date} eventDate - Event date
   * @param {Object} userProfile - User profile
   * @returns {boolean} - Whether time is available
   */
  isTimeAvailable(eventDate, userProfile) {
    // Simple implementation: check if event is during typical college hours
    const hour = new Date(eventDate).getHours();
    return hour >= 9 && hour <= 18; // 9 AM to 6 PM
  }

  /**
   * Calculate location score based on proximity
   * @param {string} eventLocation - Event location
   * @param {string} preferredLocation - User's preferred location
   * @returns {number} - Location score (0-15)
   */
  calculateLocationScore(eventLocation, preferredLocation) {
    // Simple string matching - in production, use geolocation API
    if (eventLocation === preferredLocation) return 15;
    if (eventLocation && preferredLocation && 
        eventLocation.toLowerCase().includes(preferredLocation.toLowerCase())) {
      return 10;
    }
    return 5; // Partial credit for any location
  }

  /**
   * Check if event skill level matches user skill level
   * @param {string} eventSkillLevel - Event skill level (beginner/intermediate/advanced)
   * @param {string} userSkillLevel - User skill level
   * @returns {boolean} - Whether skill levels match
   */
  isSkillLevelMatch(eventSkillLevel, userSkillLevel) {
    if (!eventSkillLevel || !userSkillLevel) return true; // No skill requirements

    const skillHierarchy = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
    const eventLevel = skillHierarchy[eventSkillLevel] || 2;
    const userLevel = skillHierarchy[userSkillLevel] || 2;

    // User should be at or above event skill level
    return userLevel >= eventLevel;
  }

  /**
   * Enrich recommendations with AI-powered reasoning (optional)
   * @param {Array} recommendations - Array of recommended events
   * @param {Object} userProfile - User profile
   * @returns {Promise<Array>} - Enriched recommendations
   */
  async enrichRecommendationsWithAI(recommendations, userProfile) {
    // If AI is not configured, return recommendations without reasoning
    if (!aiConfig.isConfigured()) {
      return recommendations.map(rec => ({
        ...rec,
        reasoning: 'Based on your event preferences and history'
      }));
    }

    try {
      // Optional: Add AI reasoning for top recommendations
      const topRecommendations = recommendations.slice(0, 3);
      
      // For now, return with basic reasoning
      // In production, call AI API to generate personalized reasoning
      return recommendations.map((rec, index) => ({
        ...rec,
        reasoning: this.generateReasoning(rec, userProfile, index + 1)
      }));
    } catch (error) {
      console.error('Error enriching recommendations with AI:', error);
      return recommendations; // Fallback to basic recommendations
    }
  }

  /**
   * Generate human-readable reasoning for recommendation
   * @param {Object} event - Event object
   * @param {Object} userProfile - User profile
   * @param {number} rank - Recommendation rank
   * @returns {string} - Reasoning text
   */
  generateReasoning(event, userProfile, rank) {
    const reasons = [];

    if (rank === 1) reasons.push('This is our top recommendation for you');
    if (event.registrationCount > 20) reasons.push('Popular event based on attendees');
    if (event.type === 'team') reasons.push('Team events like this match your interests');
    
    return reasons.length > 0 
      ? reasons.join('. ') + '.'
      : 'Recommended based on your preferences';
  }

  /**
   * Get trending events (system-wide popular events)
   * @param {number} limit - Number of trending events
   * @returns {Promise<Array>} - Array of trending events
   */
  async getTrendingEvents(limit = 5) {
    try {
      const allEvents = await this.getAllEvents();
      return allEvents
        .sort((a, b) => (b.registrationCount || 0) - (a.registrationCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching trending events:', error);
      return [];
    }
  }

  /**
   * Get similar events based on a given event
   * @param {string} eventId - Reference event ID
   * @param {number} limit - Number of similar events
   * @returns {Promise<Array>} - Array of similar events
   */
  async getSimilarEvents(eventId, limit = 5) {
    try {
      const referenceEventRef = doc(db, 'events', eventId);
      const referenceEventSnap = await getDoc(referenceEventRef);

      if (!referenceEventSnap.exists()) {
        throw new Error('Reference event not found');
      }

      const referenceEvent = referenceEventSnap.data();
      const allEvents = await this.getAllEvents();

      const similarEvents = allEvents
        .filter(event => event.id !== eventId)
        .map(event => ({
          ...event,
          similarity: this.calculateSimilarity(event, referenceEvent)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarEvents;
    } catch (error) {
      console.error('Error fetching similar events:', error);
      return [];
    }
  }

  /**
   * Calculate similarity score between two events
   * @param {Object} event1 - First event
   * @param {Object} event2 - Second event
   * @returns {number} - Similarity score (0-100)
   */
  calculateSimilarity(event1, event2) {
    let similarity = 0;

    if (event1.type === event2.type) similarity += 25;
    if (event1.clubId === event2.clubId) similarity += 30;
    if (event1.location === event2.location) similarity += 20;
    if (Math.abs(
      new Date(event1.eventDate).getMonth() - 
      new Date(event2.eventDate).getMonth()
    ) <= 1) similarity += 15;
    if (event1.skillLevel === event2.skillLevel) similarity += 10;

    return Math.min(similarity, 100);
  }
}

export default new RecommendationEngine();
