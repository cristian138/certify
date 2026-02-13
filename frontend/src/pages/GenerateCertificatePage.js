import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { certificateService, templateService } from '../services/api';
import { ArrowLeft, Plus, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

export const GenerateCertificatePage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('individual');
  
  // Individual form
  const [individualForm, setIndividualForm] = useState({
    template_id: '',
    participant_name: '',
    document_id: '',
    certifier_name: '',
    representative_name: '',
    representative_name_2: '',
    representative_name_3: '',
    event_name: '',
    course_name: '',
  });

  // Batch form
  const [batchForm, setBatchForm] = useState({
    template_id: '',
    event_name: '',
    course_name: '',
    file: null,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (error) {
      toast.error('Error al cargar plantillas');
    }
  };

  const handleIndividualChange = (e) => {
    setIndividualForm({
      ...individualForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleBatchChange = (e) => {
    setBatchForm({
      ...batchForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await certificateService.create(individualForm);
      toast.success('Certificado generado exitosamente');
      navigate('/certificates');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar certificado');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setBatchForm({ ...batchForm, file: acceptedFiles[0] });
      }
    },
  });

  const handleBatchSubmit = async (e) => {
    e.preventDefault();

    if (!batchForm.file) {
      toast.error('Por favor selecciona un archivo Excel');
      return;
    }

    setLoading(true);

    try {
      const certificates = await certificateService.createBatch(
        batchForm.template_id,
        batchForm.event_name,
        batchForm.course_name,
        batchForm.file
      );
      toast.success(`${certificates.length} certificados generados exitosamente`);
      navigate('/certificates');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar certificados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="generate-certificate-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/certificates')}
          className="text-slate-300 hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold font-outfit text-white mb-2">Generar Certificado</h1>
          <p className="text-slate-400">Crea certificados individuales o en lote</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="individual" className="data-[state=active]:bg-accent" data-testid="tab-individual">
              Individual
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-accent" data-testid="tab-batch">
              Masivo (Excel)
            </TabsTrigger>
          </TabsList>

          {/* Individual Form */}
          <TabsContent value="individual" className="mt-6">
            <form onSubmit={handleIndividualSubmit} className="space-y-6" data-testid="individual-form">
              <div>
                <Label htmlFor="template_id" className="text-slate-300">Plantilla *</Label>
                <Select
                  value={individualForm.template_id}
                  onValueChange={(value) => setIndividualForm({ ...individualForm, template_id: value })}
                  required
                >
                  <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white" data-testid="individual-template-select">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id} className="text-white">
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="participant_name" className="text-slate-300">Nombre Participante *</Label>
                  <Input
                    id="participant_name"
                    name="participant_name"
                    value={individualForm.participant_name}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    required
                    data-testid="participant-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="document_id" className="text-slate-300">Documento ID *</Label>
                  <Input
                    id="document_id"
                    name="document_id"
                    value={individualForm.document_id}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    required
                    data-testid="document-id-input"
                  />
                </div>

                <div>
                  <Label htmlFor="certifier_name" className="text-slate-300">Certificador *</Label>
                  <Input
                    id="certifier_name"
                    name="certifier_name"
                    value={individualForm.certifier_name}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    required
                    data-testid="certifier-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="representative_name" className="text-slate-300">Representante 1 *</Label>
                  <Input
                    id="representative_name"
                    name="representative_name"
                    value={individualForm.representative_name}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    required
                    data-testid="representative-1-input"
                  />
                </div>

                <div>
                  <Label htmlFor="representative_name_2" className="text-slate-300">Representante 2</Label>
                  <Input
                    id="representative_name_2"
                    name="representative_name_2"
                    value={individualForm.representative_name_2}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="representative-2-input"
                  />
                </div>

                <div>
                  <Label htmlFor="representative_name_3" className="text-slate-300">Representante 3</Label>
                  <Input
                    id="representative_name_3"
                    name="representative_name_3"
                    value={individualForm.representative_name_3}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="representative-3-input"
                  />
                </div>

                <div>
                  <Label htmlFor="event_name" className="text-slate-300">Evento</Label>
                  <Input
                    id="event_name"
                    name="event_name"
                    value={individualForm.event_name}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="event-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="course_name" className="text-slate-300">Curso</Label>
                  <Input
                    id="course_name"
                    name="course_name"
                    value={individualForm.course_name}
                    onChange={handleIndividualChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="course-name-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover h-11"
                disabled={loading}
                data-testid="submit-individual-btn"
              >
                {loading ? 'Generando...' : 'Generar Certificado'}
              </Button>
            </form>
          </TabsContent>

          {/* Batch Form */}
          <TabsContent value="batch" className="mt-6">
            <form onSubmit={handleBatchSubmit} className="space-y-6" data-testid="batch-form">
              <div>
                <Label htmlFor="batch_template_id" className="text-slate-300">Plantilla *</Label>
                <Select
                  value={batchForm.template_id}
                  onValueChange={(value) => setBatchForm({ ...batchForm, template_id: value })}
                  required
                >
                  <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white" data-testid="batch-template-select">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id} className="text-white">
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="batch_event_name" className="text-slate-300">Evento</Label>
                  <Input
                    id="batch_event_name"
                    name="event_name"
                    value={batchForm.event_name}
                    onChange={handleBatchChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="batch-event-input"
                  />
                </div>

                <div>
                  <Label htmlFor="batch_course_name" className="text-slate-300">Curso</Label>
                  <Input
                    id="batch_course_name"
                    name="course_name"
                    value={batchForm.course_name}
                    onChange={handleBatchChange}
                    className="mt-2 bg-slate-800 border-slate-700 text-white"
                    data-testid="batch-course-input"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Archivo Excel *</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-accent bg-accent/10'
                      : 'border-slate-700 hover:border-accent/50'
                  }`}
                  data-testid="batch-file-dropzone"
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  {batchForm.file ? (
                    <div>
                      <p className="text-white font-medium">{batchForm.file.name}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {(batchForm.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white mb-2">
                        Arrastra un archivo Excel o haz clic para seleccionar
                      </p>
                      <p className="text-sm text-slate-400">.xlsx o .xls</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  El archivo debe contener columnas: participant_name, document_id, certifier_name, representative_name, representative_name_2 (opcional)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover h-11"
                disabled={loading}
                data-testid="submit-batch-btn"
              >
                {loading ? 'Generando...' : 'Generar Certificados en Lote'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
