import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, User, Calendar, Send, StopCircle, PlayCircle, Globe, MessageCircle } from 'lucide-react';
import { apiFetch } from './api';

interface Session {
  id: number;
  session_id: string;
  full_name: string;
  whatsapp: string;
  controlled_by: string | null;
  platform: 'web' | 'whatsapp';
  created_at: string;
  last_message_at: string;
  is_read: boolean;
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
  const [activeTab, setActiveTab] = useState<'web' | 'whatsapp'>('web');
  const [adminMsg, setAdminMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = () => {
    apiFetch('/api/admin/sessions')
      .then(res => res.json())
      .then(data => {
        const newSessions = Array.isArray(data) ? data : [];
        setSessions(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newSessions)) return prev;
          return newSessions;
        });
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  const fetchMessages = () => {
    if (selectedSession) {
      fetch(`/api/chat/history?session_id=${selectedSession}`)
        .then(res => res.json())
        .then(data => {
          setMessages(prev => {
            if (prev.length === data.length) return prev;
            return data;
          });
        })
        .catch(err => console.error(err));
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Polling faster to see live updates
    return () => clearInterval(interval);
  }, []);

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    // Mark as read in DB
    apiFetch(`/api/admin/sessions/${sessionId}/read`, { method: 'POST' })
      .then(() => {
        // Local update to avoid flicker before next fetch
        setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, is_read: 1 } : s));
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsg.trim() || !selectedSession || sending) return;

    setSending(true);
    try {
      const res = await apiFetch(`/api/admin/sessions/${selectedSession}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: adminMsg })
      });
      if (res.ok) {
        setAdminMsg('');
        fetchMessages();
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const [takeoverLoading, setTakeoverLoading] = useState<string | null>(null);

  // ... inside Chats component
  const handleTakeover = async (action: 'assume' | 'release') => {
    if (!selectedSession) return;
    console.log(`[FRONTEND] Takeover: ${action} for ${selectedSession}`);
    setTakeoverLoading(selectedSession);
    try {
      const res = await apiFetch(`/api/admin/sessions/${selectedSession}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      console.log(`[FRONTEND] Response Status: ${res.status}`);

      if (res.ok) {
        // Instant local update
        setSessions(prev => prev.map(s =>
          s.session_id === selectedSession ? { ...s, controlled_by: action === 'assume' ? 'admin' : null } : s
        ));
        fetchMessages();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Resposta inválida do servidor' }));
        console.error('[FRONTEND] Takeover Error:', errorData);
        alert(`Erro: ${errorData.error || 'Falha no servidor'}`);
      }
    } catch (err) {
      console.error('[FRONTEND] Network Error:', err);
      alert('Erro de conexão');
    } finally {
      setTakeoverLoading(null);
    }
  };

  const [wsStatus, setWsStatus] = useState<any>(null);

  const fetchWsStatus = () => {
    fetch('/api/whatsapp/status')
      .then(res => res.json())
      .then(data => setWsStatus(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchWsStatus();
    const interval = setInterval(fetchWsStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'whatsapp') {
      // Only show real whatsapp sessions, ignore dummy 'test-ses' unless connected for dev
      return s.platform === 'whatsapp' && (wsStatus?.connected || !s.session_id.startsWith('test-'));
    }
    return s.platform === 'web' || !s.platform;
  });

  const currentSession = sessions.find(s => s.session_id === selectedSession);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('web')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'web' ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
        >
          <Globe className="w-5 h-5" /> Chat do Site (Widget)
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'whatsapp' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp Business
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Session List */}
        <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className={`w-4 h-4 ${activeTab === 'web' ? 'text-blue-500' : 'text-green-500'}`} />
              {activeTab === 'web' ? 'Conversas Online' : 'Fila do WhatsApp'}
            </h2>
            <div className="flex items-center gap-2">
              {activeTab === 'whatsapp' && (
                <div className={`w-2 h-2 rounded-full ${wsStatus?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              )}
              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                {filteredSessions.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'whatsapp' && !wsStatus?.connected ? (
              <div className="p-8 text-center bg-gray-50 h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <MessageCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-gray-800 font-bold text-sm mb-2">
                  WhatsApp Desconectado
                </p>
                <p className="text-gray-500 text-[11px] max-w-[200px] leading-relaxed mb-6">
                  Você precisa conectar seu aparelho para visualizar e responder mensagens do WhatsApp.
                </p>
                <a
                  href="/admin/settings"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  Conectar Agora
                </a>
              </div>
            ) : (
              <>
                {filteredSessions.map(session => (
                  <div
                    key={session.session_id}
                    onClick={() => handleSessionSelect(session.session_id)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-all relative ${selectedSession === session.session_id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    {!session.is_read && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm ring-2 ring-white" />
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 truncate pr-2 text-sm">
                        {session.full_name || 'Visitante Anônimo'}
                      </h3>
                      <span className="text-[9px] text-gray-400 font-medium">
                        {new Date(session.last_message_at || session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> {session.whatsapp || '(Sem número)'}
                        </p>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-blue-400 opacity-70">
                          ID: {session.session_id.slice(0, 8)}
                        </span>
                      </div>
                      {session.controlled_by === 'admin' && (
                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredSessions.length === 0 && !loading && (
                  <div className="p-8 text-center bg-gray-50 h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      {activeTab === 'web' ? <Globe className="w-8 h-8 text-blue-200" /> : <MessageCircle className="w-8 h-8 text-green-200" />}
                    </div>
                    <p className="text-gray-500 font-bold text-sm mb-2">
                      {activeTab === 'whatsapp' ? 'Nenhuma conversa ativa' : 'Sem visitas no site'}
                    </p>
                    <p className="text-gray-400 text-[11px] max-w-[200px] leading-relaxed">
                      {activeTab === 'whatsapp'
                        ? 'As conversas do WhatsApp aparecerão aqui assim que novos clientes entrarem em contato.'
                        : 'Aguarde novos visitantes iniciarem o chat pelo widget.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${currentSession?.controlled_by === 'admin' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                    {(currentSession?.full_name || 'V')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{currentSession?.full_name || 'Sessão Ativa'}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${currentSession?.controlled_by === 'admin' ? 'bg-orange-500' : 'bg-green-500'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-gray-500">
                        {currentSession?.controlled_by === 'admin' ? 'Modo Humano / IA Pausada' : 'IA Gerindo Atendimento'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTakeover(currentSession?.controlled_by === 'admin' ? 'release' : 'assume')}
                    disabled={takeoverLoading === selectedSession}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 border shadow-sm ${currentSession?.controlled_by === 'admin'
                      ? 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                      : 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600 hover:shadow-orange-200'
                      } disabled:opacity-50`}
                  >
                    {takeoverLoading === selectedSession ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : currentSession?.controlled_by === 'admin' ? (
                      <PlayCircle className="w-4 h-4" />
                    ) : (
                      <StopCircle className="w-4 h-4" />
                    )}
                    {currentSession?.controlled_by === 'admin' ? 'Reativar Robô' : 'Assumir Controle'}
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                {messages.map((msg, idx) => {
                  const isNewDay = idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[idx - 1].timestamp).toDateString();
                  return (
                    <React.Fragment key={msg.id}>
                      {isNewDay && (
                        <div className="flex justify-center my-4">
                          <span className="bg-gray-200 text-gray-500 text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                            {new Date(msg.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`group relative max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                          }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <div className={`text-[8px] mt-2 flex items-center justify-between gap-4 uppercase font-bold opacity-70`}>
                            <span>{msg.sender === 'bot' ? '🤖 Suporte' : '👤 Cliente'}</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                  <input
                    type="text"
                    value={adminMsg}
                    onChange={(e) => setAdminMsg(e.target.value)}
                    placeholder={currentSession?.controlled_by === 'admin' ? "Escreva sua mensagem aqui..." : "Clique em 'Assumir Controle' acima para digitar"}
                    disabled={currentSession?.controlled_by !== 'admin' || sending}
                    className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={currentSession?.controlled_by !== 'admin' || !adminMsg.trim() || sending}
                    className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center justify-center min-w-[44px]"
                  >
                    {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5 fill-current" />}
                  </button>
                </form>
                {currentSession?.controlled_by !== 'admin' && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-orange-500 bg-orange-50 py-2 rounded-lg border border-orange-100 animate-pulse">
                    <StopCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Atendimento Automático: IA está respondendo agora</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/20">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-gray-600 font-medium">Nenhuma conversa selecionada</h3>
              <p className="text-sm">Escolha uma sessão à esquerda para gerenciar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
