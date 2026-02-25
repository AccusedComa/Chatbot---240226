import React, { useEffect, useState, useRef } from 'react';
import { Save, Upload, Check, AlertCircle, Loader2, FileText, Trash2, X } from 'lucide-react';
import { apiFetch } from './api';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [savedGroqKey, setSavedGroqKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savedPrompt, setSavedPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [ragDocs, setRagDocs] = useState<{ id: number; filename: string; created_at: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchRagDocs();
  }, []);

  const fetchSettings = () => {
    apiFetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.gemini_api_key) setSavedKey(data.gemini_api_key);
        if (data.groq_api_key) setSavedGroqKey(data.groq_api_key);

        if (data.system_prompt) {
          setSystemPrompt(data.system_prompt);
          setSavedPrompt(data.system_prompt);
        } else {
          const defaultPrompt = `Você é um assistente virtual da BHS Eletrônica.\nUse o contexto abaixo para responder à pergunta do usuário.\nSe a resposta não estiver no contexto, diga que não encontrou a informação específica, mas tente ajudar com conhecimentos gerais de eletrônica se possível, deixando claro que é uma sugestão geral.\nSeja cordial e breve.`;
          setSystemPrompt(defaultPrompt);
        }
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  const fetchRagDocs = () => {
    apiFetch('/api/admin/rag/documents')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setRagDocs(data) : setRagDocs([]))
      .catch(() => setRagDocs([]));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await fetch('/api/admin/rag/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg({ text: `✅ ${data.message}`, ok: true });
        fetchRagDocs();
      } else {
        setUploadMsg({ text: `❌ ${data.error}`, ok: false });
      }
    } catch (err: any) {
      setUploadMsg({ text: `❌ ${err.message}`, ok: false });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await apiFetch(`/api/admin/rag/documents/${id}`, { method: 'DELETE' });
      fetchRagDocs();
    } catch (err) { console.error(err); }
  };

  const handleSaveKey = async (type: 'gemini' | 'groq') => {
    const value = type === 'gemini' ? apiKey : groqApiKey;
    if (!value) return;

    try {
      await apiFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: type === 'gemini' ? 'gemini_api_key' : 'groq_api_key',
          value
        })
      });

      if (type === 'gemini') {
        setSavedKey('••••••••' + value.slice(-4));
        setApiKey('');
      } else {
        setSavedGroqKey('••••••••' + value.slice(-4));
        setGroqApiKey('');
      }
      alert('Chave salva com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar chave.');
    }
  };

  const handleSavePrompt = async () => {
    if (!systemPrompt) return;
    try {
      await apiFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'system_prompt', value: systemPrompt })
      });
      setSavedPrompt(systemPrompt);
      alert('Prompt do sistema salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar prompt.');
    }
  };

  const [wsStatus, setWsStatus] = useState<any>(null);
  const [connectingWs, setConnectingWs] = useState(false);

  const fetchWsStatus = () => {
    fetch('/api/whatsapp/status')
      .then(res => res.json())
      .then(data => setWsStatus(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const interval = setInterval(fetchWsStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectWs = async () => {
    setConnectingWs(true);
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setConnectingWs(false);
    }
  };

  const handleLogoutWs = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      fetchWsStatus();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        <p className="text-gray-500">Ajustes gerais do sistema e Inteligência Artificial.</p>
      </header>

      {/* Gemini API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          Configuração da IA (Gemini)
          {savedKey && <Check className="w-5 h-5 text-green-500" />}
        </h3>
        <div className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder={savedKey || "Cole sua API Key aqui..."}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button
              onClick={() => handleSaveKey('gemini')}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            {savedKey ? (
              <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <Check className="w-3 h-3" /> Chave configurada e ativa
              </span>
            ) : (
              <span className="text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                <AlertCircle className="w-3 h-3" /> Nenhuma chave configurada (IA inativa)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Groq API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          Configuração da IA Reserva (Groq)
          {savedGroqKey && <Check className="w-5 h-5 text-green-500" />}
        </h3>
        <div className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">Groq API Key</label>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder={savedGroqKey || "Cole sua API Key do Groq aqui..."}
              value={groqApiKey}
              onChange={e => setGroqApiKey(e.target.value)}
            />
            <button
              onClick={() => handleSaveKey('groq')}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            {savedGroqKey ? (
              <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <Check className="w-3 h-3" /> Chave reserva configurada
              </span>
            ) : (
              <span className="text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                <AlertCircle className="w-3 h-3" /> Sem chave reserva (não haverá fallback)
              </span>
            )}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 italic">
            * O sistema usará o Groq automaticamente se o Gemini atingir o limite do tier gratuito.
          </p>
        </div>
      </div>

      {/* WhatsApp Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          Conexão WhatsApp
          {wsStatus?.connected && <Check className="w-5 h-5 text-green-500" />}
        </h3>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${wsStatus?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-medium text-gray-700">
                Status: {wsStatus?.connected ? 'Conectado' : (wsStatus?.qr ? 'Aguardando Leitura' : 'Desconectado')}
              </span>
            </div>

            {wsStatus?.me && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Conectado como:</p>
                <p className="font-mono font-bold text-gray-800">{wsStatus.me.id.split(':')[0]}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!wsStatus?.connected && !wsStatus?.qr && (
                <button
                  onClick={handleConnectWs}
                  disabled={connectingWs}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {connectingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar WhatsApp'}
                </button>
              )}

              {wsStatus?.connected && (
                <button
                  onClick={handleLogoutWs}
                  className="bg-red-50 text-red-600 border border-red-200 px-6 py-2 rounded-lg hover:bg-red-100 flex items-center gap-2 font-medium transition-all active:scale-95"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {wsStatus?.qr && !wsStatus?.connected && (
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center animate-in zoom-in-95 duration-300">
              <p className="text-sm font-medium text-gray-700 mb-3">Escaneie o QR Code abaixo:</p>
              <img src={wsStatus.qr} alt="WhatsApp QR Code" className="w-48 h-48 shadow-lg rounded-lg" />
              <p className="text-[11px] text-gray-400 mt-4 text-center max-w-[200px]">
                Abra o WhatsApp no seu celular {"->"} Configurações {"->"} Aparelhos Conectados {"->"} Conectar um Aparelho.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Prompt do Sistema</h3>
          <button
            onClick={handleSavePrompt}
            disabled={systemPrompt === savedPrompt}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95 ${systemPrompt === savedPrompt
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            <Save className="w-4 h-4" /> Salvar Alterações
          </button>
        </div>
        <textarea
          className="w-full h-64 border border-gray-300 rounded-lg p-4 text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Digite as instruções para a IA aqui..."
        />
        <p className="text-xs text-gray-400 mt-2">O prompt define a personalidade e as regras da IA. Use este espaço para refinar como ela deve responder.</p>
      </div>

      {/* RAG Document Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Base de Conhecimento (RAG)</h3>
        <p className="text-sm text-gray-500 mb-4">Envie documentos PDF ou TXT para que a IA use como referência nas respostas.</p>

        {/* Upload area */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${uploading ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/20'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-300" />
          )}
          <p className="text-sm font-medium text-gray-600">
            {uploading ? 'Processando documento...' : 'Clique para selecionar ou arraste um arquivo'}
          </p>
          <p className="text-xs text-gray-400">PDF ou TXT · Máx: 10MB</p>
        </div>

        {uploadMsg && (
          <div className={`mt-3 flex items-start gap-2 px-4 py-3 rounded-lg text-sm font-medium ${uploadMsg.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
            {uploadMsg.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{uploadMsg.text}</span>
            <button onClick={() => setUploadMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Document list */}
        {ragDocs.length > 0 && (
          <div className="mt-5">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Documentos carregados ({ragDocs.length})</h4>
            <div className="space-y-2">
              {ragDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                    title="Remover documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {ragDocs.length === 0 && !uploading && (
          <p className="text-center text-xs text-gray-400 mt-4">Nenhum documento na base ainda.</p>
        )}
      </div>
    </div>
  );
}
