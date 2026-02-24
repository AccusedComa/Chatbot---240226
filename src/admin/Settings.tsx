import React, { useEffect, useState } from 'react';
import { Save, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

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

      {/* RAG Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 transition-all hover:shadow-md">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Base de Conhecimento (RAG)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Faça upload de documentos (PDF ou TXT) para treinar a IA com informações específicas da sua empresa.
        </p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-all duration-300 bg-gray-50/50 hover:border-blue-400 group relative overflow-hidden">
          <div className="relative z-10">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:text-blue-500" />
            <p className="text-gray-600 mb-4 font-medium">Arraste e solte arquivos aqui ou clique para selecionar</p>
            
            <label className="inline-block bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-sm font-medium active:scale-95">
              Selecionar Arquivo
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-blue-600 text-sm font-medium animate-pulse">Processando documento e gerando embeddings...</p>
             </div>
          )}
        </div>
        
        {uploadMsg && (
            <div className={`mt-4 p-4 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2 ${uploadMsg.startsWith('Erro') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
              {uploadMsg.startsWith('Erro') ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {uploadMsg}
            </div>
        )}
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
