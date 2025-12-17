// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Sparkles, BookOpen, BrainCircuit, Loader } from 'lucide-react';
import './AIAssistant.scss';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm your AI Study Assistant. I can help you summarize notes, generate quizzes, or answer questions. How can I help today?", sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Mock AI Response
    setTimeout(() => {
      let aiResponseText = "I'm processing your request...";
      
      if (userMsg.text.toLowerCase().includes('quiz')) {
        aiResponseText = "Sure! I can generate a quiz for you. Please paste the notes or topic you'd like me to use.";
      } else if (userMsg.text.toLowerCase().includes('summarize')) {
        aiResponseText = "I can help with that. Please provide the text you want me to summarize.";
      } else {
        aiResponseText = "That's interesting! Tell me more or ask me a specific study question.";
      }

      const aiMsg = { id: Date.now() + 1, text: aiResponseText, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button 
        className="ai-toggle-btn"
        onClick={toggleChat}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bot size={24} />
      </motion.button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-assistant-container"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
          >
            <div className="ai-header">
              <div className="header-info">
                <div className="avatar">
                  <Bot size={20} />
                </div>
                <div>
                  <h3>Study AI</h3>
                  <span className="status">Online</span>
                </div>
              </div>
              <button className="close-btn" onClick={toggleChat}>
                <X size={18} />
              </button>
            </div>

            <div className="ai-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.sender}`}>
                  <div className="message-content">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message ai typing">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="ai-input-area">
              <div className="quick-actions">
                <button className="action-chip" onClick={() => setInputText("Generate a quiz about...")}>
                  <BrainCircuit size={14} /> Quiz
                </button>
                <button className="action-chip" onClick={() => setInputText("Summarize this...")}>
                  <BookOpen size={14} /> Summarize
                </button>
              </div>
              <div className="input-wrapper">
                <textarea 
                  placeholder="Ask anything..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
                <button className="send-btn" onClick={handleSend} disabled={!inputText.trim()}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
