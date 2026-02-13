import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';
import { ArrowLeft, Save, Plus, Trash2, Type, Hash, Calendar, QrCode } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const fieldTypes = [
  { value: 'participant_name', label: 'Nombre Participante', icon: Type },
  { value: 'document_id', label: 'Documento ID', icon: Hash },
  { value: 'certifier_name', label: 'Nombre Certificador', icon: Type },
  { value: 'representative_name', label: 'Representante 1', icon: Type },
  { value: 'representative_name_2', label: 'Representante 2', icon: Type },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'unique_code', label: 'Código Único', icon: Hash },
  { value: 'qr_code', label: 'Código QR', icon: QrCode },
];

const DraggableField = ({ field, onDrag, onClick, isSelected, scale }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fieldRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - field.x * scale,
      y: e.clientY - field.y * scale,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = (e.clientX - dragStart.x) / scale;
    const newY = (e.clientY - dragStart.y) / scale;
    
    onDrag(field.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const fieldType = fieldTypes.find(t => t.value === field.field_type);

  return (
    <div
      ref={fieldRef}
      className={`absolute cursor-move ${
        isSelected ? 'ring-2 ring-accent' : 'ring-1 ring-slate-400'
      }`}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        backgroundColor: field.field_type === 'qr_code' ? '#f0f0f0' : 'rgba(37, 99, 235, 0.2)',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick(field.id);
      }}
      data-testid={`canvas-field-${field.id}`}
    >
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700 pointer-events-none">
        {fieldType?.label}
      </div>
    </div>
  );
};

export const TemplateEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, scale: 1 });

  useEffect(() => {
    loadTemplate();
  }, [id]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && template) {
        const containerWidth = canvasRef.current.offsetWidth;
        const scale = containerWidth / template.width;
        setCanvasSize({
          width: containerWidth,
          height: template.height * scale,
          scale,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [template]);

  const loadTemplate = async () => {
    try {
      const data = await templateService.getById(id);
      setTemplate(data);
      setFields(data.fields || []);
    } catch (error) {
      toast.error('Error al cargar plantilla');
    } finally {
      setLoading(false);
    }
  };

  const addField = (fieldType) => {
    const newField = {
      id: `field-${Date.now()}`,
      field_type: fieldType,
      x: 100,
      y: 100,
      width: fieldType === 'qr_code' ? 150 : 300,
      height: fieldType === 'qr_code' ? 150 : 40,
      font_family: 'Arial',
      font_size: 16,
      font_color: '#000000',
      text_align: 'left',
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
    toast.success('Campo agregado');
  };

  const updateField = (fieldId, updates) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const deleteField = (fieldId) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
    toast.success('Campo eliminado');
  };

  const handleFieldDrag = (fieldId, position) => {
    updateField(fieldId, position);
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await templateService.update(id, { fields });
      toast.success('Plantilla guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar plantilla');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-white">Cargando...</div>;
  }

  const selectedFieldData = fields.find(f => f.id === selectedField);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" data-testid="template-editor-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
            <h1 className="text-3xl font-bold font-outfit text-white">{template?.name}</h1>
            <p className="text-slate-400">Editor de plantilla</p>
          </div>
        </div>
        <Button
          onClick={saveTemplate}
          disabled={saving}
          className="bg-accent hover:bg-accent-hover"
          data-testid="save-template-btn"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Panel - Tools */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Campos</h3>
          <div className="space-y-2">
            {fieldTypes.map((type) => (
              <Button
                key={type.value}
                onClick={() => addField(type.value)}
                variant="outline"
                className="w-full justify-start border-slate-700 text-white hover:bg-slate-800"
                data-testid={`add-field-${type.value}`}
              >
                <type.icon className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>

          {/* Fields List */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Campos en Canvas ({fields.length})</h3>
            <div className="space-y-2">
              {fields.map((field) => {
                const fieldType = fieldTypes.find(t => t.value === field.field_type);
                return (
                  <div
                    key={field.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedField === field.id
                        ? 'bg-accent text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedField(field.id)}
                    data-testid={`field-item-${field.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{fieldType?.label}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(field.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-950 hover:text-red-400"
                        data-testid={`delete-field-${field.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="col-span-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 overflow-auto">
          <div
            ref={canvasRef}
            className="relative bg-white rounded-lg shadow-2xl mx-auto"
            style={{
              width: '100%',
              height: canvasSize.height || 500,
              backgroundImage: template ? `url(${templateService.getImage(template.id)})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
            onClick={() => setSelectedField(null)}
            data-testid="template-canvas"
          >
            {fields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                onDrag={handleFieldDrag}
                onClick={setSelectedField}
                isSelected={selectedField === field.id}
                scale={canvasSize.scale}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Propiedades</h3>
          
          {selectedFieldData ? (
            <div className="space-y-4" data-testid="field-properties">
              <div>
                <Label className="text-slate-300">Tipo de Campo</Label>
                <p className="text-white mt-1 font-medium">
                  {fieldTypes.find(t => t.value === selectedFieldData.field_type)?.label}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">X</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedFieldData.x)}
                    onChange={(e) => updateField(selectedField, { x: parseFloat(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    data-testid="field-x-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedFieldData.y)}
                    onChange={(e) => updateField(selectedField, { y: parseFloat(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    data-testid="field-y-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Ancho</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedFieldData.width)}
                    onChange={(e) => updateField(selectedField, { width: parseFloat(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    data-testid="field-width-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Alto</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedFieldData.height)}
                    onChange={(e) => updateField(selectedField, { height: parseFloat(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    data-testid="field-height-input"
                  />
                </div>
              </div>

              {selectedFieldData.field_type !== 'qr_code' && (
                <>
                  <div>
                    <Label className="text-slate-300">Tamaño de Fuente</Label>
                    <Input
                      type="number"
                      value={selectedFieldData.font_size}
                      onChange={(e) => updateField(selectedField, { font_size: parseInt(e.target.value) })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      data-testid="field-fontsize-input"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Color</Label>
                    <Input
                      type="color"
                      value={selectedFieldData.font_color}
                      onChange={(e) => updateField(selectedField, { font_color: e.target.value })}
                      className="mt-1 h-10 bg-slate-800 border-slate-700"
                      data-testid="field-color-input"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Alineación</Label>
                    <Select
                      value={selectedFieldData.text_align}
                      onValueChange={(value) => updateField(selectedField, { text_align: value })}
                    >
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white" data-testid="field-align-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="left" className="text-white">Izquierda</SelectItem>
                        <SelectItem value="center" className="text-white">Centro</SelectItem>
                        <SelectItem value="right" className="text-white">Derecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">
              Selecciona un campo para editar sus propiedades
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
