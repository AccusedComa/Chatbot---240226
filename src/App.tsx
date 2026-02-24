import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import Chats from './admin/Chats';
import Departments from './admin/Departments';
import Settings from './admin/Settings';
import AdminLayout from './admin/AdminLayout';
import ChatWidget from './widget/ChatWidget';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          BHS Eletrônica
        </h1>
        <p className="text-xl text-slate-300">
          Demonstração do Chatbot Omnichannel com IA e RAG.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-2 text-blue-300">Widget Demo</h3>
            <p className="text-sm text-slate-400 mb-4">
              Interaja com o botão flutuante no canto inferior direito para testar o fluxo de onboarding.
            </p>
          </div>
          
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-2 text-emerald-300">Admin Panel</h3>
            <p className="text-sm text-slate-400 mb-4">
              Acesse o painel administrativo para configurar a IA e ver estatísticas.
            </p>
            <Link 
              to="/admin/login" 
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-sm font-medium transition-colors"
            >
              Acessar Admin
            </Link>
          </div>
        </div>
      </div>
      
      {/* The Widget is always mounted here for demo purposes */}
      <ChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<Login />} />
        
        {/* Admin Routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chats" element={<Chats />} />
          <Route path="departments" element={<Departments />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
