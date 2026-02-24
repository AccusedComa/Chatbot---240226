import React from 'react';

export default function Settings() {
  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        <p className="text-gray-500">Ajustes gerais do sistema.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Status da API</h3>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-green-500"></div>
           <span className="text-gray-700 font-medium">Backend Online</span>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
                <strong>Gemini API Key:</strong> {process.env.GEMINI_API_KEY ? 'Configurada (Oculta)' : 'Não detectada pelo Frontend (Seguro)'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
                Nota: Chaves de API do servidor não são visíveis diretamente no frontend por segurança.
            </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Prompt do Sistema</h3>
        <p className="text-sm text-gray-500 mb-2">Este é o prompt base usado para instruir a IA.</p>
        <textarea 
            className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm font-mono bg-gray-50"
            readOnly
            value={`Você é um assistente virtual da BHS Eletrônica.
Use o contexto abaixo para responder à pergunta do usuário.
Se a resposta não estiver no contexto, diga que não encontrou a informação específica, mas tente ajudar com conhecimentos gerais de eletrônica se possível, deixando claro que é uma sugestão geral.
Seja cordial e breve.`}
        />
        <p className="text-xs text-gray-400 mt-2">Para editar o prompt, contate o administrador do sistema (hardcoded no backend por enquanto).</p>
      </div>
    </div>
  );
}
