import React, { useEffect, useState } from 'react';
import { Save, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from './api';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [savedGroqKey, setSavedGroqKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savedPrompt, setSavedPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
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
    </div>
  );
}
