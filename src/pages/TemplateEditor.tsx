import { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
  Save, Square, Type, Image as ImageIcon, Circle,
  ZoomIn, ZoomOut, Loader2, Edit2, Trash2, Check,
  MoveUp, MoveDown, Heading
} from 'lucide-react';
import { templateService } from '../lib/template-service';
import SvgLibrary from '../components/SvgLibrary';
import { createSvgPath } from '../lib/svg-utils';

const SAMPLE_TITLE = "Recipe Title";
const DEFAULT_ZOOM = 0.4;
const FACEBOOK_TEMPLATES = [
  { name: 'Post', width: 1024, height: 1024 },
  { name: 'Story', width: 1080, height: 1920 },
  { name: 'Cover', width: 820, height: 312 },
  { name: 'Profile', width: 180, height: 180 },
];

export default function TemplateEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(FACEBOOK_TEMPLATES[0]);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTitlePlaceholder, setIsTitlePlaceholder] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      // Clean up previous canvas if it exists
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: selectedTemplate.width * DEFAULT_ZOOM,
        height: selectedTemplate.height * DEFAULT_ZOOM,
        backgroundColor: '#ffffff',
        selection: true
      });

      fabricCanvas.setZoom(DEFAULT_ZOOM);

      fabricCanvas.on('selection:created', (e) => {
        const selected = e.selected?.[0];
        setSelectedObject(selected || null);
        setIsTitlePlaceholder(selected?.data?.isPlaceholder || false);
      });

      fabricCanvas.on('selection:cleared', () => {
        setSelectedObject(null);
        setIsTitlePlaceholder(false);
      });

      fabricCanvas.on('selection:updated', (e) => {
        const selected = e.selected?.[0];
        setSelectedObject(selected || null);
        setIsTitlePlaceholder(selected?.data?.isPlaceholder || false);
      });

      fabricCanvasRef.current = fabricCanvas;

      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      };
    }
  }, [selectedTemplate]);

  async function loadTemplates() {
    try {
      const templates = await templateService.loadTemplates();
      setSavedTemplates(templates);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    if (!fabricCanvasRef.current || !templateName.trim()) {
      setError('Please enter a template name');
      return;
    }
    
    setIsSaving(true);
    setError(null);

    try {
      const canvasData = fabricCanvasRef.current.toJSON(['data']);
      
      const template = {
        name: templateName.trim(),
        canvas_data: canvasData,
        is_active: true
      };

      await templateService.saveTemplate(template);
      await loadTemplates();
      setTemplateName('');
      setError(null);
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await templateService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleEdit = (template: any) => {
    if (!fabricCanvasRef.current) return;

    setTemplateName(template.name);
    fabricCanvasRef.current.loadFromJSON(template.canvas_data, () => {
      fabricCanvasRef.current?.setZoom(DEFAULT_ZOOM);
      fabricCanvasRef.current?.setWidth(selectedTemplate.width * DEFAULT_ZOOM);
      fabricCanvasRef.current?.setHeight(selectedTemplate.height * DEFAULT_ZOOM);
      fabricCanvasRef.current?.renderAll();
    });
  };

  const handleZoom = (delta: number) => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(Math.max(zoomLevel + delta, 0.1), 5);
    setZoomLevel(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.setWidth(selectedTemplate.width * newZoom);
    fabricCanvasRef.current.setHeight(selectedTemplate.height * newZoom);
    fabricCanvasRef.current.renderAll();
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Sample Text', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 40,
      fill: '#000000',
      data: { isPlaceholder: false }
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!fabricCanvasRef.current) return;
    
    const shapeProps = {
      left: 100,
      top: 100,
      fill: '#000000',
      width: 100,
      height: type === 'rect' ? 100 : undefined,
      radius: type === 'circle' ? 50 : undefined
    };

    const shape = type === 'rect' 
      ? new fabric.Rect(shapeProps)
      : new fabric.Circle(shapeProps);

    fabricCanvasRef.current.add(shape);
    fabricCanvasRef.current.setActiveObject(shape);
    fabricCanvasRef.current.renderAll();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvasRef.current || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result || !fabricCanvasRef.current) return;

      fabric.Image.fromURL(event.target.result.toString(), (img) => {
        const scale = Math.min(200 / img.width!, 200 / img.height!);
        img.scale(scale);
        
        img.set({
          left: 100,
          top: 100
        });

        fabricCanvasRef.current?.add(img);
        fabricCanvasRef.current?.setActiveObject(img);
        fabricCanvasRef.current?.renderAll();
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSvgSelect = (pathData: string) => {
    if (!fabricCanvasRef.current) return;
    const path = createSvgPath(pathData);
    fabricCanvasRef.current.add(path);
    fabricCanvasRef.current.setActiveObject(path);
    fabricCanvasRef.current.renderAll();
  };

  const toggleTitlePlaceholder = () => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof fabric.IText)) {
      setError('Only text elements can be set as title placeholders');
      return;
    }

    fabricCanvasRef.current.getObjects().forEach(obj => {
      if (obj !== selectedObject && obj.data?.isPlaceholder) {
        obj.set('data', { ...obj.data, isPlaceholder: false });
      }
    });

    const newValue = !isTitlePlaceholder;
    selectedObject.set('data', { 
      ...selectedObject.data, 
      isPlaceholder: newValue 
    });
    setIsTitlePlaceholder(newValue);

    if (newValue) {
      selectedObject.set('text', SAMPLE_TITLE);
    }

    fabricCanvasRef.current.renderAll();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white shadow-sm rounded-lg m-4 overflow-hidden">
        {/* Top Bar */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedTemplate.name}
              onChange={(e) => setSelectedTemplate(FACEBOOK_TEMPLATES.find(t => t.name === e.target.value)!)}
              className="rounded-md border-gray-300 text-sm"
            >
              {FACEBOOK_TEMPLATES.map(template => (
                <option key={template.name} value={template.name}>
                  {template.name} ({template.width}x{template.height})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-2 hover:bg-gray-100 rounded-md"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => handleZoom(0.1)}
                className="p-2 hover:bg-gray-100 rounded-md"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              className="rounded-md border-gray-300 text-sm"
            />

            <button
              onClick={handleSave}
              disabled={isSaving || !templateName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Template
            </button>
          </div>
        </div>

        {error && (
          <div className="flex-shrink-0 m-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Left Toolbar */}
          <div className="flex-shrink-0 w-14 bg-white border-r flex flex-col items-center py-4 gap-4">
            <button
              onClick={addText}
              className="p-2 hover:bg-gray-100 rounded-md"
              title="Add Text"
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              onClick={() => addShape('rect')}
              className="p-2 hover:bg-gray-100 rounded-md"
              title="Add Rectangle"
            >
              <Square className="h-4 w-4" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="p-2 hover:bg-gray-100 rounded-md"
              title="Add Circle"
            >
              <Circle className="h-4 w-4" />
            </button>
            <label className="p-2 hover:bg-gray-100 rounded-md cursor-pointer" title="Upload Image">
              <ImageIcon className="h-4 w-4" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
            <SvgLibrary onSelect={handleSvgSelect} />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative bg-gray-50 overflow-auto">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div 
                className="bg-white shadow-lg"
                style={{
                  width: selectedTemplate.width * zoomLevel,
                  height: selectedTemplate.height * zoomLevel,
                  cursor: 'default',
                  minWidth: selectedTemplate.width * zoomLevel,
                  minHeight: selectedTemplate.height * zoomLevel
                }}
              >
                <canvas ref={canvasRef} style={{ userSelect: 'none' }} />
              </div>
            </div>
          </div>

          {/* Right Properties Panel */}
          <div className="flex-shrink-0 w-64 bg-white border-l flex flex-col min-h-0">
            <div className="p-4 overflow-y-auto">
              <h3 className="font-medium mb-4">Properties</h3>
              {selectedObject && (
                <div className="space-y-4">
                  {/* Common Properties */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fill Color
                    </label>
                    <input
                      type="color"
                      value={selectedObject.fill?.toString() || '#000000'}
                      onChange={(e) => {
                        selectedObject.set('fill', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                      }}
                      className="w-full h-8 p-0 border rounded"
                    />
                  </div>

                  {/* Text Properties */}
                  {(selectedObject instanceof fabric.IText || selectedObject instanceof fabric.Text) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Font Family
                        </label>
                        <select
                          value={selectedObject.fontFamily}
                          onChange={(e) => {
                            selectedObject.set('fontFamily', e.target.value);
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className="w-full rounded-md border-gray-300 text-sm"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={selectedObject.fontSize}
                          onChange={(e) => {
                            selectedObject.set('fontSize', parseInt(e.target.value));
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className="w-full rounded-md border-gray-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Text Alignment
                        </label>
                        <select
                          value={selectedObject.textAlign}
                          onChange={(e) => {
                            selectedObject.set('textAlign', e.target.value as any);
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className="w-full rounded-md border-gray-300 text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            selectedObject.set('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className={`flex-1 px-3 py-1.5 rounded text-sm ${
                            selectedObject.fontWeight === 'bold'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          Bold
                        </button>
                        <button
                          onClick={() => {
                            selectedObject.set('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className={`flex-1 px-3 py-1.5 rounded text-sm ${
                            selectedObject.fontStyle === 'italic'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          Italic
                        </button>
                      </div>

                      <button
                        onClick={toggleTitlePlaceholder}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                          isTitlePlaceholder
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isTitlePlaceholder ? (
                          <>
                            <Check className="h-4 w-4" />
                            Title Placeholder Set
                          </>
                        ) : (
                          <>
                            <Heading className="h-4 w-4" />
                            Set as Title Placeholder
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Shape Properties */}
                  {(selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Width</label>
                            <input
                              type="number"
                              value={selectedObject.width}
                              onChange={(e) => {
                                selectedObject.set('width', parseInt(e.target.value));
                                if (selectedObject instanceof fabric.Circle) {
                                  selectedObject.set('radius', parseInt(e.target.value) / 2);
                                }
                                fabricCanvasRef.current?.renderAll();
                              }}
                              className="w-full rounded-md border-gray-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Height</label>
                            <input
                              type="number"
                              value={selectedObject instanceof fabric.Circle ? selectedObject.width : selectedObject.height}
                              onChange={(e) => {
                                if (selectedObject instanceof fabric.Circle) {
                                  selectedObject.set('width', parseInt(e.target.value));
                                  selectedObject.set('radius', parseInt(e.target.value) / 2);
                                } else {
                                  selectedObject.set('height', parseInt(e.target.value));
                                }
                                fabricCanvasRef.current?.renderAll();
                              }}
                              className="w-full rounded-md border-gray-300 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {selectedObject instanceof fabric.Rect && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Corner Radius
                          </label>
                          <input
                            type="number"
                            value={selectedObject.rx || 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              selectedObject.set({
                                rx: value,
                                ry: value
                              });
                              fabricCanvasRef.current?.renderAll();
                            }}
                            className="w-full rounded-md border-gray-300 text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Opacity
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={selectedObject.opacity}
                          onChange={(e) => {
                            selectedObject.set('opacity', parseFloat(e.target.value));
                            fabricCanvasRef.current?.renderAll();
                          }}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  {/* Rotation for all objects */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rotation
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedObject.angle || 0}
                      onChange={(e) => {
                        selectedObject.set('angle', parseInt(e.target.value));
                        fabricCanvasRef.current?.renderAll();
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Templates Section */}
        <div className="flex-shrink-0 border-t">
          <div className="p-4 overflow-x-hidden overflow-y-auto max-h-48">
            <h2 className="text-lg font-semibold mb-4">Saved Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden relative group"
                >
                  <div className="aspect-video bg-gray-50 flex items-center justify-center">
                    <div className="text-sm text-gray-500">Template Preview</div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.is_active && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 bg-white rounded-full shadow-sm hover:bg-blue-50"
                    >
                      <Edit2 className="h-4 w-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}