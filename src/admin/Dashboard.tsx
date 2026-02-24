import React, { useEffect, useState } from 'react';
import { BarChart, Users, MessageSquare, Upload, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ sessions: 0, messages: 0, documents: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

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
        // Refresh stats
        fetch('/api/admin/stats')
          .then(res => res.json())
          .then(data => setStats(data));
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
    <div>
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Última atualização: Hoje</span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">Sessões Ativas</h3>
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.sessions}</p>
            <span className="text-green-500 text-sm font-medium">+12% essa semana</span>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">Mensagens Trocadas</h3>
              <div className="bg-blue-100 p-2 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.messages}</p>
            <span className="text-blue-500 text-sm font-medium">Total acumulado</span>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">Documentos RAG</h3>
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.documents}</p>
            <span className="text-purple-500 text-sm font-medium">Base de conhecimento</span>
          </div>
        </div>

        {/* RAG Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Base de Conhecimento (RAG)</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Arraste e solte arquivos PDF ou TXT aqui</p>
            <p className="text-gray-400 text-sm mb-4">ou</p>
            <label className="bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition">
              Selecionar Arquivo
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {uploading && <p className="mt-4 text-blue-600">Enviando e processando...</p>}
            {uploadMsg && <p className={`mt-4 ${uploadMsg.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}>{uploadMsg}</p>}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Atividade Recente</h3>
          <div className="text-gray-500 text-center py-8">
            Nenhuma atividade recente para exibir.
          </div>
        </div>
    </div>
  );
}
