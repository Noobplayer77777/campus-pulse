import React from 'react';
import { useUI } from '../hooks/useUI';

export default function Toast() {
  const { notifications } = useUI();

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
}
