import React, { useEffect, useState } from 'react';
import { MessageSquare, User, Calendar } from 'lucide-react';
import { apiFetch } from './api';

interface Session {
  id: number;
  session_id: string;
  full_name: string;
  whatsapp: string;
  created_at: string;
}

interface Message {
  id: number;
  sender: 'user' | 'bot' | 'system';
  content: string;
  timestamp: string;
}

export default function Chats() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetch(`/api/chat/history?session_id=${selectedSession}`)
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(err => console.error(err));
    }
  }, [selectedSession]);

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Session List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-800">Conversas Recentes</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map(session => (
            <div
              key={session.session_id}
              onClick={() => setSelectedSession(session.session_id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedSession === session.session_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-gray-900">{session.full_name || 'Visitante Anônimo'}</h3>
                <span className="text-xs text-gray-400">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <User className="w-3 h-3" /> {session.whatsapp || 'Sem contato'}
              </p>
              <p className="text-xs text-gray-400 mt-2 font-mono truncate">
                ID: {session.session_id.slice(0, 8)}...
              </p>
            </div>
          ))}
          {sessions.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">Nenhuma conversa iniciada.</div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-gray-800">Histórico da Conversa</h3>
              <p className="text-xs text-gray-500">Session ID: {selectedSession}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-[10px] block mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Selecione uma conversa para visualizar o histórico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
