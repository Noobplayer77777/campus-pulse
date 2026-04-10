import React, { createContext, useReducer, useCallback } from 'react';

export const UIContext = createContext();

const initialState = {
  isLoading: false,
  notifications: [],
  activeModal: null,
  modalData: null,
};

function uiReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            ...action.payload,
          },
        ],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        activeModal: action.payload.name,
        modalData: action.payload.data || null,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: null,
        modalData: null,
      };
    default:
      return state;
  }
}

export function UIProvider({ children }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const addNotification = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = Date.now();
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { id, message, type },
      });

      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, duration);
    },
    []
  );

  const openModal = useCallback((name, data) => {
    dispatch({ type: 'OPEN_MODAL', payload: { name, data } });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  // showToast is an alias for addNotification for convenience
  const showToast = addNotification;

  const value = {
    ...state,
    dispatch,
    addNotification,
    showToast,
    openModal,
    closeModal,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
