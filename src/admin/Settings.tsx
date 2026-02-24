import React, { useEffect, useState } from 'react';
import { Save, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<any>(null);
  const [connectingWs, setConnectingWs] = useState(false);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchWsStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchWsStatus = () => {
    fetch('/api/whatsapp/status')
      .then(res => res.json())
      .then(data => setWsStatus(data))
      .catch(err => console.error(err));
  };

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

  const fetchSettings = () => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.gemini_api_key) setSavedKey(data.gemini_api_key);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  const handleSaveKey = async () => {
    if (!apiKey) return;

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gemini_api_key', value: apiKey })
      });
      setSavedKey('********' + apiKey.slice(-4));
      setApiKey('');
      alert('API Key salva com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar API Key.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadMsg('');

    try {
      const res = await fetch('/api/admin/rag/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMsg(`Sucesso: ${data.message}`);
      } else {
        setUploadMsg(`Erro: ${data.error}`);
      }
    } catch (err) {
      setUploadMsg('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        <p className="text-gray-500">Ajustes gerais do sistema e Inteligência Artificial.</p>
      </header>

      {/* API Key Section */}
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
              onClick={handleSaveKey}
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

      {/* WhatsApp Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          Conexão WhatsApp
          {wsStatus?.status === 'open' && <Check className="w-5 h-5 text-green-500" />}
        </h3>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <p className="text-sm text-gray-600">
              Conecte o WhatsApp do seu chatbot para permitir que ele envie e receba mensagens em tempo real.
              Escaneie o QR Code ao lado como se fosse no WhatsApp Web.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${wsStatus?.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span className="text-sm font-medium text-gray-700">
                  Status: {wsStatus?.status === 'open' ? 'Conectado' :
                    wsStatus?.status === 'qr' ? 'Aguardando Escaneamento' :
                      wsStatus?.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>
              {wsStatus?.phone && (
                <p className="text-xs text-gray-500 ml-6">Número: {wsStatus.phone}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {wsStatus?.status === 'close' ? (
                <button
                  onClick={handleConnectWs}
                  disabled={connectingWs}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-all disabled:opacity-50 shadow-sm"
                >
                  {connectingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 rotate-90" />}
                  Conectar WhatsApp
                </button>
              ) : (
                <button
                  onClick={handleLogoutWs}
                  className="bg-white border border-red-200 text-red-600 px-6 py-2 rounded-lg hover:bg-red-50 flex items-center gap-2 font-medium transition-all shadow-sm"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-64 aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
            {wsStatus?.qrDataUrl ? (
              <img src={wsStatus.qrDataUrl} alt="WhatsApp QR Code" className="w-full h-full object-contain animate-in zoom-in-95 duration-300" />
            ) : wsStatus?.status === 'open' ? (
              <div className="text-center text-green-600">
                <Check className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-wider">Conexão Ativa</p>
              </div>
            ) : wsStatus?.status === 'connecting' ? (
              <div className="text-center text-gray-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p className="text-xs font-medium">Iniciando...</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-medium px-4">Aguardando solicitação de conexão</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Prompt Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Prompt do Sistema</h3>
        <textarea
          className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          readOnly
          value={`Você é um assistente virtual da BHS Eletrônica.
Use o contexto abaixo para responder à pergunta do usuário.
Se a resposta não estiver no contexto, diga que não encontrou a informação específica, mas tente ajudar com conhecimentos gerais de eletrônica se possível, deixando claro que é uma sugestão geral.
Seja cordial e breve.`}
        />
        <p className="text-xs text-gray-400 mt-2">O prompt define a personalidade e as regras da IA.</p>
      </div>
    </div>
  );
}
