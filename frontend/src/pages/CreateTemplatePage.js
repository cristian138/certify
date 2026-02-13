import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';
import { Upload, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

export const CreateTemplatePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    width: 1000,
    height: 707,
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);

        // Create preview
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      }
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('width', formData.width);
      data.append('height', formData.height);
      data.append('file', file);

      const template = await templateService.create(data);
      toast.success('Plantilla creada exitosamente');
      navigate(`/templates/${template.id}/editor`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear plantilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="create-template-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/templates')}
          className="text-slate-300 hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold font-outfit text-white mb-2">Nueva Plantilla</h1>
          <p className="text-slate-400">Crea una nueva plantilla de certificado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-template-form">
            <div>
              <Label htmlFor="name" className="text-slate-300">Nombre de la Plantilla</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Certificado de Curso"
                className="mt-2 bg-slate-800 border-slate-700 text-white"
                required
                data-testid="template-name-input"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-slate-300">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe el propósito de esta plantilla"
                className="mt-2 bg-slate-800 border-slate-700 text-white"
                rows={4}
                data-testid="template-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width" className="text-slate-300">Ancho (px)</Label>
                <Input
                  id="width"
                  name="width"
                  type="number"
                  value={formData.width}
                  onChange={handleChange}
                  className="mt-2 bg-slate-800 border-slate-700 text-white"
                  required
                  data-testid="template-width-input"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-slate-300">Alto (px)</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  value={formData.height}
                  onChange={handleChange}
                  className="mt-2 bg-slate-800 border-slate-700 text-white"
                  required
                  data-testid="template-height-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">Archivo de Plantilla</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-accent bg-accent/10'
                    : 'border-slate-700 hover:border-accent/50'
                }`}
                data-testid="file-dropzone"
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                {file ? (
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white mb-2">
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-slate-400">PNG, JPG o PDF (máx. 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent-hover h-11"
              disabled={loading}
              data-testid="submit-template-btn"
            >
              {loading ? 'Creando...' : 'Crear Plantilla'}
            </Button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Vista Previa</h3>
          <div className="aspect-[1.414] bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center">
                <Upload className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Sin vista previa</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
