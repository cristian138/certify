import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { templateService } from '../services/api';
import { FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (error) {
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await templateService.delete(deleteDialog.id);
      toast.success('Plantilla eliminada');
      loadTemplates();
    } catch (error) {
      toast.error('Error al eliminar plantilla');
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  return (
    <div className="space-y-8" data-testid="templates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-outfit text-white mb-2">Plantillas</h1>
          <p className="text-slate-400">Gestiona tus plantillas de certificados</p>
        </div>
        <Link to="/templates/new">
          <Button className="bg-accent hover:bg-accent-hover" data-testid="create-template-btn">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay plantillas</h3>
          <p className="text-slate-400 mb-6">Crea tu primera plantilla para comenzar</p>
          <Link to="/templates/new">
            <Button className="bg-accent hover:bg-accent-hover">
              <Plus className="w-5 h-5 mr-2" />
              Crear Primera Plantilla
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden hover:border-accent/50 transition-all"
              data-testid={`template-card-${template.id}`}
            >
              <div className="aspect-[1.414] bg-slate-800 relative overflow-hidden">
                <img
                  src={templateService.getImage(template.id)}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                  {template.description || 'Sin descripción'}
                </p>
                <div className="flex items-center gap-2">
                  <Link to={`/templates/${template.id}/editor`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-white hover:bg-slate-800"
                      data-testid={`edit-template-${template.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-950"
                    onClick={() => setDeleteDialog({ open: true, id: template.id })}
                    data-testid={`delete-template-${template.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-template"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
