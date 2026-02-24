import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  icon: string;
  type: 'ai' | 'human' | 'hybrid';
  phone?: string;
  display_order: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState({ name: '', icon: '', type: 'ai', phone: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = () => {
    fetch('/api/admin/departments')
      .then(res => res.json())
      .then(data => {
        setDepartments(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  const handleAdd = async () => {
    if (!newDept.name) return;

    try {
      await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept)
      });
      setNewDept({ name: '', icon: '', type: 'ai', phone: '' });
      fetchDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    // if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    
    try {
      console.log('Deleting department:', id);
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchDepartments();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir departamento');
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Departamentos</h2>
        <p className="text-gray-500">Gerencie as áreas de atendimento do seu chatbot.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Adicionar Novo</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="Ex: Financeiro"
              value={newDept.name}
              onChange={e => setNewDept({...newDept, name: e.target.value})}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ícone (Emoji)</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="💰"
              value={newDept.icon}
              onChange={e => setNewDept({...newDept, icon: e.target.value})}
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select 
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              value={newDept.type}
              onChange={e => setNewDept({...newDept, type: e.target.value as any})}
            >
              <option value="ai">IA (Automático)</option>
              <option value="human">Humano</option>
              <option value="hybrid">Híbrido</option>
            </select>
          </div>
          
          {(newDept.type === 'human' || newDept.type === 'hybrid') && (
            <div className="w-48 animate-in fade-in slide-in-from-left-4 duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Ex: 11999999999"
                value={newDept.phone}
                onChange={e => setNewDept({...newDept, phone: e.target.value})}
              />
            </div>
          )}

          <button 
            onClick={handleAdd}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">Ordem</th>
              <th className="p-4 font-medium text-gray-600">Ícone</th>
              <th className="p-4 font-medium text-gray-600">Nome</th>
              <th className="p-4 font-medium text-gray-600">Tipo</th>
              <th className="p-4 font-medium text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 text-gray-500">#{dept.display_order} <span className="text-xs text-gray-300">({dept.id})</span></td>
                <td className="p-4 text-2xl">{dept.icon}</td>
                <td className="p-4 font-medium text-gray-800">
                  {dept.name}
                  {dept.phone && <div className="text-xs text-gray-400 font-normal mt-0.5">📞 {dept.phone}</div>}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dept.type === 'ai' ? 'bg-purple-100 text-purple-700' :
                    dept.type === 'human' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {dept.type.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dept.id);
                    }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                    title="Excluir departamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Nenhum departamento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
