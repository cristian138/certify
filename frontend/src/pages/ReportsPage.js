import React, { useState, useEffect } from 'react';
import { statsService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsService.get();
      setStats(data);
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  // Mock data for chart - in production, this would come from the API
  const chartData = [
    { name: 'Ene', certificados: 12 },
    { name: 'Feb', certificados: 19 },
    { name: 'Mar', certificados: 15 },
    { name: 'Abr', certificados: 25 },
    { name: 'May', certificados: 22 },
    { name: 'Jun', certificados: stats?.certificates_this_month || 0 },
  ];

  return (
    <div className="space-y-8" data-testid="reports-page">
      <div>
        <h1 className="text-4xl font-bold font-outfit text-white mb-2">Reportes</h1>
        <p className="text-slate-400">Análisis y estadísticas de certificaciones</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white mb-1">{stats?.total_templates || 0}</p>
            <p className="text-sm text-slate-400">Plantillas Activas</p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white mb-1">{stats?.total_certificates || 0}</p>
            <p className="text-sm text-slate-400">Total Certificados</p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white mb-1">{stats?.certificates_this_month || 0}</p>
            <p className="text-sm text-slate-400">Este Mes</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Certificados por Mes</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
              }}
            />
            <Bar dataKey="certificados" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Actividad Reciente</h2>
        
        {stats?.recent_certificates && stats.recent_certificates.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{cert.participant_name}</p>
                    <p className="text-sm text-slate-400">Código: {cert.unique_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    {new Date(cert.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cert.validation_count} validaciones
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No hay actividad reciente</p>
        )}
      </div>
    </div>
  );
};
