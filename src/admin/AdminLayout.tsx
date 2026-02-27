import React from 'react';
import { BarChart, Users, MessageSquare, Settings, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token');

  React.useEffect(() => {
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate, token]);

  if (!token) {
    return null; // Don't render outlet components if unauthorized, avoids 401 crashes
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">BHS Admin</h1>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <Link
            to="/admin/dashboard"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            to="/admin/chats"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/chats') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Conversas</span>
          </Link>
          <Link
            to="/admin/departments"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/departments') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Departamentos</span>
          </Link>
          <Link
            to="/admin/settings"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive('/admin/settings') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configurações</span>
          </Link>
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="flex items-center space-x-3 text-red-600 hover:bg-red-50 px-4 py-3 rounded-lg w-full transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
