import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  options?: { label: string; value: string }[];
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting message constant
  const GREETING_MSG: Message = {
    id: 0,
    text: "👋 Olá! Sou a sua assistente virtual da BHS Eletrônica.\nEstou aqui para ajudar você! 😊\n📝 Para começarmos, por favor digite seu nome completo:",
    sender: 'bot'
  };

  useEffect(() => {
    const initChat = async () => {
      let currentSessionId = localStorage.getItem('chat_session_id');

      if (!currentSessionId) {
        // Create new session
        try {
          const res = await fetch('/api/chat/session', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            currentSessionId = data.session_id;
            localStorage.setItem('chat_session_id', currentSessionId!);
          }
        } catch (err) {
          console.error('Failed to create session:', err);
          return;
        }
      }

      if (currentSessionId) {
        setSessionId(currentSessionId);
        // Load history
        try {
          const res = await fetch(`/api/chat/history?session_id=${currentSessionId}`);
          if (res.ok) {
            const history = await res.json();
            if (history && history.length > 0) {
              // Map DB messages to UI format
              const formattedHistory = history.map((m: any) => ({
                id: m.id,
                text: m.content,
                sender: m.sender,
                // TODO: Store options in DB to restore them correctly
              }));
              setMessages(formattedHistory);
            } else {
              // No history, show greeting
              setMessages([GREETING_MSG]);
            }
          }
        } catch (err) {
          console.error('Failed to load history:', err);
          // Fallback to greeting if offline/error
          setMessages([GREETING_MSG]);
        }
      }
    };

    initChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() || !sessionId) return;

    const userMsg = text;
    setInputValue('');
    addMessage({ id: Date.now(), text: userMsg, sender: 'user' });

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMsg })
      });
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      
      addMessage({ 
        id: Date.now() + 1, 
        text: data.response, 
        sender: 'bot',
        options: data.options 
      });
    } catch (err) {
      console.error(err);
      addMessage({ id: Date.now() + 1, text: "Desculpe, tive um erro de conexão.", sender: 'bot' });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-gray-200
                       w-[90vw] sm:w-[380px] 
                       h-[80vh] sm:h-[600px] max-h-[600px]"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">BHS Eletrônica</h3>
                  <span className="text-xs text-blue-100 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                    Online
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.options && (
                    <div className="mt-2 space-y-2 w-[85%]">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSend(opt.value)}
                          className="w-full text-left px-4 py-2 bg-white border border-blue-100 text-blue-600 text-sm rounded-xl hover:bg-blue-50 transition shadow-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2 shrink-0">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-gray-100 text-gray-800 text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
