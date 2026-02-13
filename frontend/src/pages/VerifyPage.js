import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { certificateService } from '../services/api';
import { CheckCircle, XCircle, Shield, Calendar, Hash, User } from 'lucide-react';
import { toast } from 'sonner';

export const VerifyPage = () => {
  const { code } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (code) {
      verifyCertificate();
    }
  }, [code]);

  const verifyCertificate = async () => {
    try {
      const data = await certificateService.verify(code);
      setCertificate(data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Certificado no encontrado');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-white text-xl">Verificando certificado...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 sm:p-6 md:p-8" data-testid="verify-page">
      <div className="w-full max-w-4xl">
        {error ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 sm:p-12 text-center" data-testid="verify-error">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white mb-4">Certificado No Válido</h1>
            <p className="text-slate-400 text-base sm:text-lg">{error}</p>
          </div>
        ) : certificate ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl" data-testid="verify-success">
            {/* Header with validation status */}
            <div className="flex items-center justify-center mb-6 sm:mb-8">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center ${
                certificate.is_valid ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {certificate.is_valid ? (
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-400" />
                ) : (
                  <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400" />
                )}
              </div>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white mb-2">
                {certificate.is_valid ? 'Certificado Válido' : 'Certificado Inválido'}
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">Verificación de autenticidad</p>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Hash className="w-5 h-5 text-accent flex-shrink-0" />
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Código Único</h3>
                </div>
                <p className="text-xl sm:text-2xl font-bold font-mono text-white break-all" data-testid="cert-unique-code">
                  {certificate.unique_code}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-accent flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Participante</h3>
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-white break-words" data-testid="cert-participant-name">
                    {certificate.participant_name}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 break-all">ID: {certificate.document_id}</p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-accent flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider">Fecha de Emisión</h3>
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-white" data-testid="cert-issue-date">
                    {new Date(certificate.issue_date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Detalles Adicionales</h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                    <span className="text-slate-400 flex-shrink-0">Certificador:</span>
                    <span className="text-white font-medium break-words text-right">{certificate.certifier_name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                    <span className="text-slate-400 flex-shrink-0">Representante:</span>
                    <span className="text-white font-medium break-words text-right">{certificate.representative_name}</span>
                  </div>
                  {certificate.representative_name_2 && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className="text-slate-400 flex-shrink-0">Representante 2:</span>
                      <span className="text-white font-medium break-words text-right">{certificate.representative_name_2}</span>
                    </div>
                  )}
                  {certificate.representative_name_3 && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className="text-slate-400 flex-shrink-0">Representante 3:</span>
                      <span className="text-white font-medium break-words text-right">{certificate.representative_name_3}</span>
                    </div>
                  )}
                  {certificate.event_name && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className="text-slate-400 flex-shrink-0">Evento:</span>
                      <span className="text-white font-medium break-words text-right">{certificate.event_name}</span>
                    </div>
                  )}
                  {certificate.course_name && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className="text-slate-400 flex-shrink-0">Curso:</span>
                      <span className="text-white font-medium break-words text-right">{certificate.course_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Info */}
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-accent flex-shrink-0" />
                  <h3 className="text-xs sm:text-sm font-semibold text-accent uppercase tracking-wider">Información de Seguridad</h3>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Este certificado ha sido verificado {certificate.validation_count} {certificate.validation_count === 1 ? 'vez' : 'veces'}.
                  La información es auténtica y ha sido validada contra nuestra base de datos.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
