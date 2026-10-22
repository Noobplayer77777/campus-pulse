import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { onAuthStateChanged, logoutUser } from '../services/authService';

export const AuthContext = createContext();

const initialState = {
  user: null,
  role: null, // 'student' | 'club' | 'admin'
  loading: true,
  error: null,
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        role: action.payload ? action.payload.role : null,
        isAuthenticated: !!action.payload,
      };
    case 'SET_ROLE':
      return {
        ...state,
        role: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Subscribe to unified auth provider state changes
    const unsubscribe = onAuthStateChanged((authUser) => {
      if (authUser) {
        // Ensure both uid and userId are present for backward compatibility
        const normalizedUser = {
          ...authUser,
          uid: authUser.uid || authUser.userId,
          userId: authUser.userId || authUser.uid,
          displayName: authUser.displayName || authUser.name,
        };
        dispatch({ type: 'SET_USER', payload: normalizedUser });
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    // Handle 401 session expiry events dispatched by apiClient
    const handleSessionExpired = () => {
      logoutUser().catch(() => {});
      dispatch({ type: 'LOGOUT' });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('campuspulse:session-expired', handleSessionExpired);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('campuspulse:session-expired', handleSessionExpired);
      }
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  const value = {
    ...state,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
