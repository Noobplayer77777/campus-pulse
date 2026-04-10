/**
 * ChatbotWidget - Conversational AI chat interface with Tailwind CSS
 * Neo-brutalism design
 */

import React, { useEffect, useState } from 'react';
import { useChatbot } from '../hooks/useChatbot';

const ChatbotWidget = () => {
  const {
    messages,
    loading,
    error,
    isOpen,
    sendMessage,
    clearMessages,
    getSuggestedQuestions,
    sendSuggestion,
    scrollToBottom,
    toggleChatbot,
    messagesEndRef
  } = useChatbot();

  const [inputValue, setInputValue] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const suggestions = getSuggestedQuestions('dashboard');
    setSuggestedQuestions(suggestions);
  }, [getSuggestedQuestions]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    sendSuggestion(suggestion);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleChatbot}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-secondary shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-white text-2xl"
        aria-label="Open chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col border-3 border-black transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-accent to-brand-secondary text-white p-5 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h3 className="text-lg font-bold">Event Assistant</h3>
            {isMinimized && messages.length > 1 && (
              <p className="text-xs opacity-90">{messages.length} messages</p>
            )}
            {!isMinimized && (
              <p className="text-xs opacity-90">AI-powered help</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {messages.length > 1 && !isMinimized && (
            <button
              onClick={clearMessages}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              title="Clear chat"
            >
              🗑️
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white hover:bg-opacity-30 rounded-lg transition-all font-bold text-lg"
            title={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button
            onClick={toggleChatbot}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Full Chat UI - Only show when not minimized */}
      {!isMinimized && (
        <>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-100 to-purple-200 p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0 text-sm">
                🤖
              </div>
            )}
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-brand-accent text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-900 rounded-bl-none'
              } ${message.isError ? 'bg-brand-error text-white' : ''} shadow-sm`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <span className="text-xs opacity-60 mt-1 block">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-brand-gray flex items-center justify-center flex-shrink-0 text-sm">
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0">
              🤖
            </div>
            <div className="bg-gray-200 px-4 py-3 rounded-2xl rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-brand-error bg-opacity-10 border-l-4 border-brand-error p-3 rounded-lg">
            <p className="text-sm text-brand-error font-semibold">Error</p>
            <p className="text-xs text-brand-error opacity-80">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {!isMinimized && showSuggestions && messages.length <= 1 && (
        <div className="px-4 py-3 border-t-2 border-purple-300 bg-gradient-to-r from-blue-200 to-purple-200">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Try asking:</p>
          <div className="space-y-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="w-full text-left text-xs bg-white border-2 border-gray-200 p-2 rounded-xl hover:border-brand-accent hover:bg-brand-accent hover:bg-opacity-5 transition-all hover:shadow-md"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      {!isMinimized && (
      <form
        onSubmit={handleSendMessage}
        className="border-t-2 border-purple-300 bg-gradient-to-r from-blue-200 to-purple-200 p-3 flex gap-2"
      >
        <input
          type="text"
          placeholder="Ask about events..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          className="flex-1 bg-gray-100 border-2 border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent focus:ring-opacity-30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="bg-gradient-to-r from-brand-accent to-brand-secondary hover:shadow-lg text-white px-5 py-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>
      )}
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;
