export async function processImage(file: File, maxSize: number): Promise<File> {
  // Create canvas and load image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = await createImageBitmap(file);

  // Calculate new dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;
  
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  // Set canvas size and draw image
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to PNG blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Failed to process image');
      const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.png'), {
        type: 'image/png'
      });
      resolve(processedFile);
    }, 'image/png');
  });
}