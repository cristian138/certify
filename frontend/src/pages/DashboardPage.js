import React, { useState, useEffect } from 'react';
import { statsService } from '../services/api';
import { Award, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage = () => {
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
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  const statCards = [
    {
      title: 'Total Plantillas',
      value: stats?.total_templates || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Certificados',
      value: stats?.total_certificates || 0,
      icon: Award,
      color: 'bg-green-500',
    },
    {
      title: 'Este Mes',
      value: stats?.certificates_this_month || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Validaciones',
      value: stats?.total_validations || 0,
      icon: CheckCircle,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-4xl font-bold font-outfit text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Resumen general de certificaciones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-accent/50 transition-all"
            data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Certificates */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Certificados Recientes</h2>
        
        {stats?.recent_certificates && stats.recent_certificates.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                data-testid={`recent-cert-${cert.id}`}
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
                  {cert.is_valid && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      Válido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No hay certificados recientes</p>
        )}
      </div>
    </div>
  );
};
