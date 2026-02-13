import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';
import { ArrowLeft, Save, Plus, Trash2, Type, Hash, Calendar, QrCode, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const fieldTypes = [
  { value: 'participant_name', label: 'Nombre Participante', icon: Type },
  { value: 'document_id', label: 'Documento ID', icon: Hash },
  { value: 'certifier_name', label: 'Nombre Certificador', icon: Type },
  { value: 'representative_name', label: 'Representante 1', icon: Type },
  { value: 'representative_name_2', label: 'Representante 2', icon: Type },
  { value: 'representative_name_3', label: 'Representante 3', icon: Type },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'unique_code', label: 'Código Único', icon: Hash },
  { value: 'qr_code', label: 'Código QR', icon: QrCode },
];

const availableFonts = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Bookman', label: 'Bookman' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
];

const DraggableField = ({ field, onDrag, onClick, isSelected, scale }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fieldRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      } hover:ring-2 hover:ring-accent/50 transition-all`}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        backgroundColor: field.field_type === 'qr_code' ? 'rgba(240, 240, 240, 0.9)' : 'rgba(37, 99, 235, 0.3)',
        zIndex: isSelected ? 100 : 10,
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
  const [backgroundImage, setBackgroundImage] = useState(null);

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
      
      // Load background image
      const imageUrl = templateService.getImage(data.id);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBackgroundImage(imageUrl);
      };
      img.onerror = () => {
        console.error('Error loading template image');
        toast.error('Error al cargar la imagen de la plantilla');
      };
      img.src = imageUrl;
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

  // Count signers for information
  const signerFields = fields.filter(f => 
    f.field_type === 'certifier_name' || 
    f.field_type === 'representative_name' || 
    f.field_type === 'representative_name_2'
  );

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
            <p className="text-slate-400">Editor de plantilla • {fields.length} campos • {signerFields.length} firmantes</p>
          </div>
        </div>
        <Button
          onClick={saveTemplate}
          disabled={saving}
          className="bg-accent hover:bg-accent-hover"
          data-testid="save-template-btn"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Panel - Tools */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Agregar Campos</h3>
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

          <Separator className="my-6 bg-slate-700" />

          {/* Fields List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Campos en Canvas ({fields.length})</h3>
            {fields.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                Agrega campos desde arriba
              </p>
            ) : (
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
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <fieldType.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{fieldType?.label}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-950 hover:text-red-400 flex-shrink-0"
                          data-testid={`delete-field-${field.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="my-6 bg-slate-700" />

          {/* Signers Summary */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-accent" />
              <h4 className="font-semibold text-white text-sm">Configuración de Firmantes</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Certificadores:</span>
                <span className="font-medium text-white">
                  {fields.filter(f => f.field_type === 'certifier_name').length}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Representantes:</span>
                <span className="font-medium text-white">
                  {fields.filter(f => f.field_type === 'representative_name' || f.field_type === 'representative_name_2').length}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Firmantes:</span>
                <span className="font-medium text-white">{signerFields.length}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Agrega múltiples certificadores o representantes según necesites
            </p>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="col-span-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              Canvas: {template?.width} × {template?.height} px
            </p>
            <p className="text-sm text-slate-400">
              Escala: {(canvasSize.scale * 100).toFixed(0)}%
            </p>
          </div>
          <div
            ref={canvasRef}
            className="relative bg-slate-800 rounded-lg shadow-2xl mx-auto"
            style={{
              width: '100%',
              height: canvasSize.height || 500,
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
            onClick={() => setSelectedField(null)}
            data-testid="template-canvas"
          >
            {!backgroundImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Type className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Cargando imagen...</p>
                </div>
              </div>
            )}
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
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <Label className="text-accent text-xs uppercase tracking-wider">Tipo de Campo</Label>
                <p className="text-white mt-1 font-semibold">
                  {fieldTypes.find(t => t.value === selectedFieldData.field_type)?.label}
                </p>
              </div>

              <Separator className="bg-slate-700" />

              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-wider mb-2">Posición</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-slate-400 text-xs">X</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedFieldData.x)}
                      onChange={(e) => updateField(selectedField, { x: parseFloat(e.target.value) })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      data-testid="field-x-input"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Y</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedFieldData.y)}
                      onChange={(e) => updateField(selectedField, { y: parseFloat(e.target.value) })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      data-testid="field-y-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-xs uppercase tracking-wider mb-2">Tamaño</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-slate-400 text-xs">Ancho</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedFieldData.width)}
                      onChange={(e) => updateField(selectedField, { width: parseFloat(e.target.value) })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      data-testid="field-width-input"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Alto</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedFieldData.height)}
                      onChange={(e) => updateField(selectedField, { height: parseFloat(e.target.value) })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      data-testid="field-height-input"
                    />
                  </div>
                </div>
              </div>

              {selectedFieldData.field_type !== 'qr_code' && (
                <>
                  <Separator className="bg-slate-700" />

                  <div>
                    <Label className="text-slate-300 text-xs uppercase tracking-wider">Fuente</Label>
                    <Select
                      value={selectedFieldData.font_family}
                      onValueChange={(value) => updateField(selectedField, { font_family: value })}
                    >
                      <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white" data-testid="field-font-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-64">
                        {availableFonts.map(font => (
                          <SelectItem key={font.value} value={font.value} className="text-white" style={{ fontFamily: font.value }}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs uppercase tracking-wider">Tamaño de Fuente</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        value={selectedFieldData.font_size}
                        onChange={(e) => updateField(selectedField, { font_size: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 text-white"
                        min="8"
                        max="200"
                        data-testid="field-fontsize-input"
                      />
                      <span className="text-slate-400 text-sm">px</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs uppercase tracking-wider">Color de Texto</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="color"
                        value={selectedFieldData.font_color}
                        onChange={(e) => updateField(selectedField, { font_color: e.target.value })}
                        className="h-10 w-20 bg-slate-800 border-slate-700 cursor-pointer"
                        data-testid="field-color-input"
                      />
                      <Input
                        type="text"
                        value={selectedFieldData.font_color}
                        onChange={(e) => updateField(selectedField, { font_color: e.target.value })}
                        className="flex-1 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs uppercase tracking-wider">Alineación</Label>
                    <Select
                      value={selectedFieldData.text_align}
                      onValueChange={(value) => updateField(selectedField, { text_align: value })}
                    >
                      <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white" data-testid="field-align-select">
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
            <div className="text-center py-12">
              <Type className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                Selecciona un campo del canvas para editar sus propiedades
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
