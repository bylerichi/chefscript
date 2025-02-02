import { useState, useEffect } from 'react';
import { Download, Loader2, Edit2, Check, Wand2 } from 'lucide-react';
import { createDownloadableText } from '../lib/recipe-parser';
import JSZip from 'jszip';
import { fabric } from 'fabric';
import { templateService } from '../lib/template-service';

interface Recipe {
  id: string;
  name: string;
  status: 'pending' | 'completed' | 'error';
  imageUrl?: string;
  content?: string;
  error?: string;
  parsedContent?: any;
  template_id?: string;
  template_applied?: boolean;
}

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [editableTitle, setEditableTitle] = useState(recipe.parsedContent?.title || recipe.name);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [templatedImageUrl, setTemplatedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (recipe.template_applied && recipe.template_id) {
      loadTemplatedImage();
    }
  }, [recipe.template_applied, recipe.template_id]);

  async function loadTemplatedImage() {
    await applyTemplate();
  }

  async function applyTemplate() {
    if (!recipe.imageUrl || isApplyingTemplate) return;
    
    setIsApplyingTemplate(true);
    try {
      // Get active template
      const template = await templateService.getActiveTemplate();
      if (!template) {
        throw new Error('No active template found');
      }

      // Create temporary canvas
      const canvas = new fabric.Canvas(null, {
        width: 1024,
        height: 1024
      });

      // Load template
      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(template.canvas_data, () => {
          resolve();
        });
      });

      // Load recipe image with proxy for Flux URLs
      const img = await new Promise<fabric.Image>((resolve, reject) => {
        const isFluxUrl = recipe.imageUrl!.includes('bfl.ai');
        const imageUrl = isFluxUrl 
          ? `https://api.allorigins.win/raw?url=${encodeURIComponent(recipe.imageUrl!)}`
          : recipe.imageUrl!;

        fabric.Image.fromURL(imageUrl, (img) => {
          if (!img) reject(new Error('Failed to load image'));
          resolve(img);
        }, { 
          crossOrigin: 'anonymous',
          eraseTint: true,
          opacity: 1
        });
      });

      // Set image as background
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: canvas.width! / img.width!,
        scaleY: canvas.height! / img.height!,
        eraseTint: true,
        opacity: 1
      });

      // Update title placeholder if exists
      const objects = canvas.getObjects();
      for (const obj of objects) {
        if (obj.data?.isPlaceholder && obj instanceof fabric.IText) {
          obj.set('text', editableTitle);
          canvas.renderAll();
        }
      }

      // Convert to data URL with better quality
      const dataUrl = canvas.toDataURL({
        format: 'jpeg',
        quality: 1
      });

      setTemplatedImageUrl(dataUrl);

      // Clean up
      canvas.dispose();
    } catch (error) {
      console.error('Failed to apply template:', error);
      setDownloadError(error instanceof Error ? error.message : 'Failed to apply template');
    } finally {
      setIsApplyingTemplate(false);
    }
  }

  async function handleDownloadText() {
    if (!recipe.parsedContent) return;
    const textContent = createDownloadableText(recipe.parsedContent);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editableTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadImage(isTemplated: boolean = false) {
    const imageUrl = isTemplated ? templatedImageUrl : recipe.imageUrl;
    if (!imageUrl) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      if (isTemplated && templatedImageUrl?.startsWith('data:')) {
        // For data URLs, convert directly to blob
        const response = await fetch(templatedImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${editableTitle}_templated.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${editableTitle}${isTemplated ? '_templated' : ''}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      setDownloadError('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDownloadAll() {
    if (!recipe.parsedContent || !recipe.imageUrl) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const zip = new JSZip();
      const folderName = editableTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const folder = zip.folder(folderName);
      
      if (!folder) return;

      // Add text file
      const textContent = createDownloadableText(recipe.parsedContent);
      folder.file(`${editableTitle}.txt`, textContent);

      // Add original image
      try {
        const response = await fetch(recipe.imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        const imageBlob = await response.blob();
        folder.file(`${editableTitle}.jpg`, imageBlob);
      } catch (error) {
        console.error('Failed to include image in zip:', error);
        setDownloadError('Failed to include image in zip. Please try downloading separately.');
      }

      // Add templated image if available
      if (templatedImageUrl) {
        try {
          const response = await fetch(templatedImageUrl);
          if (!response.ok) throw new Error('Failed to fetch templated image');
          const imageBlob = await response.blob();
          folder.file(`${editableTitle}_templated.jpg`, imageBlob);
        } catch (error) {
          console.error('Failed to include templated image in zip:', error);
        }
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editableTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download files:', error);
      setDownloadError('Failed to create zip file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleTitleEdit() {
    if (isEditingTitle) {
      setIsEditingTitle(false);
      // Regenerate templated image with new title if exists
      if (templatedImageUrl) {
        applyTemplate();
      }
    } else {
      setIsEditingTitle(true);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-lg font-semibold"
                autoFocus
              />
            ) : (
              <h3 className="font-semibold text-lg text-gray-900">{editableTitle}</h3>
            )}
            <button
              onClick={handleTitleEdit}
              className="p-1 hover:bg-gray-100 rounded-md"
            >
              {isEditingTitle ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Edit2 className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
          <StatusBadge status={recipe.status} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Original Image */}
          {recipe.status === 'pending' ? (
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : recipe.status === 'completed' && recipe.imageUrl ? (
            <div className="relative group">
              <img
                src={recipe.imageUrl}
                alt={editableTitle}
                className="w-full h-48 object-cover rounded-lg"
              />
              {!templatedImageUrl && (
                <button
                  onClick={applyTemplate}
                  disabled={isApplyingTemplate}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                >
                  {isApplyingTemplate ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <div className="flex items-center gap-2 text-white">
                      <Wand2 className="h-5 w-5" />
                      <span>Apply Template</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center flex-col p-4">
              {recipe.error ? (
                <p className="text-red-500 text-center text-sm">{recipe.error}</p>
              ) : (
                <span className="text-gray-400">No image available</span>
              )}
            </div>
          )}

          {/* Templated Image */}
          {templatedImageUrl ? (
            <img
              src={templatedImageUrl}
              alt={`${editableTitle} (Templated)`}
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No templated image</span>
            </div>
          )}
        </div>

        {downloadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{downloadError}</p>
          </div>
        )}

        {recipe.status === 'completed' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <button
                onClick={handleDownloadText}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Recipe Text
              </button>
              <button
                onClick={() => handleDownloadImage(false)}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Original Image
              </button>
            </div>
            <div className="space-y-2">
              {templatedImageUrl && (
                <button
                  onClick={() => handleDownloadImage(true)}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Templated Image
                </button>
              )}
              <button
                onClick={handleDownloadAll}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Recipe['status'] }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800'
  };

  const labels = {
    pending: 'Pending',
    completed: 'Completed',
    error: 'Error'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}