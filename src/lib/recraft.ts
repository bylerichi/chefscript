import axios from 'axios';

interface GenerateImageOptions {
  style?: string;
  custom_style_id?: string;
  resolution?: string;
  num_images?: number;
}

// Rate limiting configuration
const RATE_LIMIT = 100; // operations per minute
const QUEUE_CHECK_INTERVAL = 600; // check queue every 600ms
let operationsThisMinute = 0;
let lastResetTime = Date.now();
const operationQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

// Reset operations counter every minute
setInterval(() => {
  operationsThisMinute = 0;
  lastResetTime = Date.now();
}, 60000);

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (operationQueue.length > 0) {
    // Check if we've hit the rate limit
    if (operationsThisMinute >= RATE_LIMIT) {
      // Wait until the next minute
      const timeToNextReset = 60000 - (Date.now() - lastResetTime);
      await new Promise(resolve => setTimeout(resolve, timeToNextReset));
      operationsThisMinute = 0;
      lastResetTime = Date.now();
    }

    // Process next operation in queue
    const operation = operationQueue.shift();
    if (operation) {
      try {
        operationsThisMinute++;
        await operation();
      } catch (error) {
        if (error instanceof Error) {
          // Enhance error messages
          if (error.message.includes('429')) {
            throw new Error('Service is busy. Please try again in a few moments.');
          }
          if (error.message.includes('401')) {
            throw new Error('Image generation service is temporarily unavailable.');
          }
          if (error.message.includes('not_enough_credits')) {
            throw new Error('The image generation service needs more credits. Please try again later.');
          }
        }
        throw error;
      }
    }

    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, QUEUE_CHECK_INTERVAL));
  }

  isProcessingQueue = false;
}

export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<string> {
  if (!import.meta.env.VITE_RECRAFT_API_KEY) {
    throw new Error('Recraft API key is not configured');
  }

  return new Promise((resolve, reject) => {
    const operation = async () => {
      const url = 'https://external.api.recraft.ai/v1/images/generations';
      
      try {
        const requestBody = {
          prompt,
          resolution: options.resolution || '1024x1024',
          num_images: options.num_images || 1,
          ...(options.custom_style_id 
            ? { style_id: options.custom_style_id }
            : { style: options.style || 'realistic_image' }
          )
        };

        const response = await axios.post(
          url,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_RECRAFT_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const imageUrl = response.data?.data?.[0]?.url;
        if (!imageUrl) {
          throw new Error('No image URL in response');
        }

        resolve(imageUrl);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.message;
          console.error('Recraft API error details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: errorMessage
          });

          // Enhanced error messages
          if (error.response?.status === 429) {
            reject(new Error('Service is busy. Please try again in a few moments.'));
            return;
          }
          if (error.response?.status === 401) {
            reject(new Error('Image generation service is temporarily unavailable.'));
            return;
          }
          reject(new Error(`Image generation failed: ${errorMessage}`));
        }
        reject(error);
      }
    };

    operationQueue.push(operation);
    processQueue().catch(reject);
  });
}

export async function createStyle(
  baseStyle: string,
  images: File[]
): Promise<string> {
  if (!import.meta.env.VITE_RECRAFT_API_KEY) {
    throw new Error('Recraft API key is not configured');
  }

  return new Promise((resolve, reject) => {
    const operation = async () => {
      const url = 'https://external.api.recraft.ai/v1/styles';
      const formData = new FormData();
      
      formData.append('style', baseStyle);
      images.forEach((file, index) => {
        formData.append(`file${index + 1}`, file);
      });
      
      try {
        const response = await axios.post(url, formData, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_RECRAFT_API_KEY}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        const styleId = response.data?.id;
        if (!styleId) {
          throw new Error('No style ID in response');
        }

        resolve(styleId);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.message;
          console.error('Style creation error details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: errorMessage
          });

          // Enhanced error messages
          if (error.response?.status === 429) {
            reject(new Error('Service is busy. Please try again in a few moments.'));
            return;
          }
          if (error.response?.status === 401) {
            reject(new Error('Style creation service is temporarily unavailable.'));
            return;
          }
          reject(new Error(`Style creation failed: ${errorMessage}`));
        }
        reject(error);
      }
    };

    operationQueue.push(operation);
    processQueue().catch(reject);
  });
}