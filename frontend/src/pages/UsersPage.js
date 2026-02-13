import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="users-page">
      <div>
        <h1 className="text-4xl font-bold font-outfit text-white mb-2">Usuarios</h1>
        <p className="text-slate-400">Gestiona los usuarios del sistema</p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Usuario</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Rol</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  data-testid={`user-row-${user.id}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-semibold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {user.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
