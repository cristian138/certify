import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { certificateService } from '../services/api';
import { Award, Plus, Download, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const data = await certificateService.getAll();
      setCertificates(data);
    } catch (error) {
      toast.error('Error al cargar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId, uniqueCode) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/certificates/${certId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${uniqueCode}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Certificado descargado');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar certificado');
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="certificates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-outfit text-white mb-2">Certificados</h1>
          <p className="text-slate-400">Gestiona los certificados generados</p>
        </div>
        <Link to="/certificates/generate">
          <Button className="bg-accent hover:bg-accent-hover" data-testid="generate-certificate-btn">
            <Plus className="w-5 h-5 mr-2" />
            Generar Certificado
          </Button>
        </Link>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-12 text-center">
          <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay certificados</h3>
          <p className="text-slate-400 mb-6">Genera tu primer certificado</p>
          <Link to="/certificates/generate">
            <Button className="bg-accent hover:bg-accent-hover">
              <Plus className="w-5 h-5 mr-2" />
              Generar Certificado
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Código</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Participante</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Documento</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Fecha</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr
                    key={cert.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    data-testid={`certificate-row-${cert.id}`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-accent font-semibold">{cert.unique_code}</span>
                    </td>
                    <td className="px-6 py-4 text-white">{cert.participant_name}</td>
                    <td className="px-6 py-4 text-slate-300">{cert.document_id}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {cert.is_valid ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Válido
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Inválido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={certificateService.download(cert.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`download-certificate-${cert.id}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-white hover:bg-slate-800"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        <a
                          href={`/verify/${cert.unique_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`verify-certificate-${cert.id}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-white hover:bg-slate-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
