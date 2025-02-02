import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createStyle, generateImage } from '../lib/recraft';
import StyleTester from '../components/StyleTester';
import { processImage } from '../lib/image-processor';

interface PreviewImage {
  id: string;
  file: File;
  preview: string;
}

interface Style {
  id: string;
  name: string;
  custom_style_id: string;
  thumbnail_url: string;
}

const TEST_PROMPT = "A beautiful plate of food on a rustic wooden table with natural lighting";
const MAX_IMAGE_SIZE = 1024; // Maximum dimension in pixels
const MIN_TOTAL_SIZE = 100; // Minimum total size in bytes
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // Maximum total size in bytes (5MB)

export default function StyleCreator() {
  const navigate = useNavigate();
  const [styleName, setStyleName] = useState('');
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStyle, setCreatedStyle] = useState<{ id: string; name: string } | null>(null);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

  useEffect(() => {
    checkAuth();
    loadUserTokens();
    loadStyles();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  }

  async function loadUserTokens() {
    const { data } = await supabase
      .from('users')
      .select('tokens')
      .single();
    
    if (data) {
      setUserTokens(data.tokens);
    }
  }

  async function loadStyles() {
    try {
      setIsLoadingStyles(true);
      const { data, error } = await supabase
        .from('styles')
        .select('id, name, custom_style_id, thumbnail_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStyles(data || []);
    } catch (err) {
      console.error('Error loading styles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load styles');
    } finally {
      setIsLoadingStyles(false);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const remainingSlots = 5 - images.length;
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);

    try {
      // Calculate total size of new files
      const newFilesSize = filesToAdd.reduce((sum, file) => sum + file.size, 0);
      
      // Calculate current total size
      const currentTotalSize = images.reduce((sum, img) => sum + img.file.size, 0);
      
      // Calculate projected total size
      const projectedTotalSize = currentTotalSize + newFilesSize;

      if (projectedTotalSize > MAX_TOTAL_SIZE) {
        throw new Error(`Total image size would exceed 5MB limit. Current total: ${(currentTotalSize / 1024 / 1024).toFixed(2)}MB, New files: ${(newFilesSize / 1024 / 1024).toFixed(2)}MB`);
      }

      const processedImages = await Promise.all(
        filesToAdd.map(async (file) => {
          const processedFile = await processImage(file, MAX_IMAGE_SIZE);
          return {
            id: crypto.randomUUID(),
            file: processedFile,
            preview: URL.createObjectURL(processedFile)
          };
        })
      );

      setImages(prev => [...prev, ...processedImages]);
      setError(null);
    } catch (err) {
      console.error('Image processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process images');
    }
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 5 - images.length,
    maxSize: MAX_TOTAL_SIZE / 5 // Max size per file (1MB)
  });

  function removeImage(id: string) {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!styleName || images.length === 0) return;

    if (userTokens !== null && userTokens < 10) {
      setError('Insufficient tokens. Style creation requires 10 tokens.');
      return;
    }

    const totalSize = images.reduce((sum, img) => sum + img.file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setError(`Total image size exceeds 5MB limit. Current total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    if (totalSize < MIN_TOTAL_SIZE) {
      setError('Total image size is too small. Please add larger images.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create style with Recraft using realistic_image as base
      const styleId = await createStyle(
        'realistic_image',
        images.map(img => img.file)
      );

      // Generate a test image as thumbnail
      const thumbnailUrl = await generateImage(TEST_PROMPT, {
        custom_style_id: styleId
      });

      // Save style to Supabase
      const { error: saveError, data: savedStyle } = await supabase
        .from('styles')
        .insert({
          name: styleName,
          base_style: 'realistic_image',
          custom_style_id: styleId,
          thumbnail_url: thumbnailUrl,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Update local token count
      setUserTokens(prev => prev !== null ? prev - 10 : null);

      // Set created style for testing
      setCreatedStyle({ id: styleId, name: styleName });

      // Clean up image previews
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      
      // Reset form
      setStyleName('');

      // Reload styles to show the new one
      await loadStyles();
    } catch (err) {
      console.error('Style creation error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to create style';
      
      if (errorMessage.includes('not_enough_credits')) {
        errorMessage = 'Your Recraft API account has insufficient credits. Please add credits to your Recraft account to create custom styles.';
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }

  // Clean up previews when component unmounts
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Create Custom Style</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Style Name
            </label>
            <input
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              placeholder="e.g., Minimalist Food Photography"
            />
            <p className="mt-1 text-sm text-gray-500">
              Creating a custom style costs 10 tokens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Images (PNG or JPG, max 5)
            </label>
            <div
              {...getRootProps()}
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                isDragActive ? 'border-primary' : 'border-gray-300'
              }`}
            >
              <div className="space-y-1 text-center">
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <p className="pl-1">
                    {isDragActive
                      ? 'Drop the files here'
                      : 'Drag & drop files or click to select'}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG or JPG up to 1MB each ({5 - images.length} remaining)
                </p>
                <p className="text-xs text-gray-500">
                  Total size limit: 5MB
                </p>
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative rounded-lg overflow-hidden group"
                >
                  <img
                    src={image.preview}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2">
                    {(image.file.size / 1024 / 1024).toFixed(2)}MB
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating || !styleName || images.length === 0}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Creating Style...
              </>
            ) : (
              'Create Style'
            )}
          </button>
        </form>
      </div>

      {/* Existing Styles Grid */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Your Styles</h3>
        {isLoadingStyles ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : styles.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {styles.map((style) => (
              <div
                key={style.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                {style.thumbnail_url ? (
                  <img
                    src={style.thumbnail_url}
                    alt={style.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No thumbnail</span>
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-medium text-gray-900">{style.name}</h4>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No styles created yet</p>
          </div>
        )}
      </div>

      {createdStyle && (
        <StyleTester 
          styleId={createdStyle.id} 
          styleName={createdStyle.name} 
        />
      )}
    </div>
  );
}