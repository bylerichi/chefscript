import { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
  Save, Square, Type, Image as ImageIcon, 
  ZoomIn, ZoomOut, Loader2, Heading, Check 
} from 'lucide-react';
import { templateService } from '../lib/template-service';

// ... (keep all interfaces and constants)

export default function TemplateEditor({ onSave, onClose, initialTemplate }: TemplateEditorProps) {
  // ... (keep all state declarations)

  // Initialize canvas with proper dimensions
  useEffect(() => {
    if (canvasRef.current) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: selectedTemplate.width,
        height: selectedTemplate.height,
        backgroundColor: '#ffffff',
        selection: true
      });

      // Set initial dimensions
      fabricCanvas.setDimensions({
        width: selectedTemplate.width,
        height: selectedTemplate.height
      });

      // Load initial template if provided
      if (initialTemplate?.canvas_data) {
        fabricCanvas.loadFromJSON(initialTemplate.canvas_data, () => {
          fabricCanvas.renderAll();
        });
      }

      // Handle selection events
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

      setCanvas(fabricCanvas);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [initialTemplate, selectedTemplate]);

  // ... (keep all other functions)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-100">
      {/* ... (keep header section) ... */}

      {/* Canvas Area */}
      <div className="flex-1 flex">
        {/* Left Toolbar */}
        <div className="w-14 bg-white border-r flex flex-col items-center py-4 gap-4">
          {/* ... (keep toolbar buttons) ... */}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="bg-white shadow-lg"
              style={{
                width: selectedTemplate.width,
                height: selectedTemplate.height
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="w-64 bg-white border-l p-4">
          {/* ... (keep properties panel) ... */}
        </div>
      </div>
    </div>
  );
}