/**
 * useRecommendations - Custom hook for event recommendations
 * Provides easy access to recommendation engine functionality
 */

import { useState, useCallback, useContext } from 'react';
import recommender from '../ai/recommender';
import { useAuth } from './useAuth';

export const useRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get user ID or generate guest ID
   */
  const getUserId = useCallback(() => {
    if (user?.uid) {
      return user.uid;
    }
    // Generate guest ID if not authenticated
    let guestId = localStorage.getItem('guestRecommendationId');
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestRecommendationId', guestId);
    }
    return guestId;
  }, [user]);

  /**
   * Fetch personalized recommendations for current user
   */
  const getRecommendations = useCallback(async (limit = 5) => {
    const userId = getUserId();

    setLoading(true);
    setError(null);

    try {
      const recs = await recommender.getRecommendations(userId, limit);
      setRecommendations(recs);
      return recs;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch recommendations';
      setError(errorMessage);
      console.error('Error fetching recommendations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  /**
   * Fetch trending events
   */
  const getTrendingEvents = useCallback(async (limit = 5) => {
    setLoading(true);
    setError(null);

    try {
      const trendingEvents = await recommender.getTrendingEvents(limit);
      setTrending(trendingEvents);
      return trendingEvents;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch trending events';
      setError(errorMessage);
      console.error('Error fetching trending events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Find events similar to a given event
   */
  const getSimilarEvents = useCallback(async (eventId, limit = 5) => {
    setLoading(true);
    setError(null);

    try {
      const similar = await recommender.getSimilarEvents(eventId, limit);
      return similar;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch similar events';
      setError(errorMessage);
      console.error('Error fetching similar events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear current recommendations
   */
  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    trending,
    loading,
    error,
    getRecommendations,
    getTrendingEvents,
    getSimilarEvents,
    clearRecommendations
  };
};
