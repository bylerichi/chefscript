import axios from 'axios';

const FLUX_API_URL = 'https://api.bfl.ml/v1';
const POLLING_INTERVAL = 500; // Poll every 500ms as per docs
const MAX_POLLING_ATTEMPTS = 120; // Maximum 1 minute of polling (120 * 500ms)

interface FluxResponse {
  id: string;
  status: 'Task not found' | 'Pending' | 'Request Moderated' | 'Content Moderated' | 'Ready' | 'Error';
  result?: {
    sample?: string; // URL for the generated image
    error?: string;
  };
}

async function checkResult(taskId: string): Promise<string> {
  let attempts = 0;

  while (attempts < MAX_POLLING_ATTEMPTS) {
    try {
      console.log(`[Flux] Checking result for task ${taskId}, attempt ${attempts + 1}`);
      
      const response = await axios.get<FluxResponse>(`${FLUX_API_URL}/get_result`, {
        params: { id: taskId },
        headers: {
          'X-Key': import.meta.env.VITE_FLUX_API_KEY,
          'accept': 'application/json'
        }
      });

      console.log(`[Flux] Response status: ${response.data.status}`);
      const { status, result } = response.data;

      switch (status) {
        case 'Ready':
          if (result?.sample) {
            console.log('[Flux] Image URL received');
            return result.sample;
          }
          throw new Error('No image URL in completed response');

        case 'Error':
          console.error('[Flux] Task failed:', result?.error);
          throw new Error(result?.error || 'Image generation failed');

        case 'Request Moderated':
        case 'Content Moderated':
          console.error('[Flux] Content moderation failed');
          throw new Error('Content was flagged by moderation system');

        case 'Task not found':
          console.error('[Flux] Task not found');
          throw new Error('Image generation task not found');

        case 'Pending':
          console.log('[Flux] Task still pending, waiting...');
          await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
          attempts++;
          break;

        default:
          console.error('[Flux] Unexpected status:', status);
          throw new Error(`Unexpected status: ${status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Flux] API Error:', {
          status: error.response?.status,
          data: error.response?.data
        });

        if (error.response?.status === 401) {
          throw new Error('Invalid Flux API key');
        }
        if (error.response?.status === 429) {
          throw new Error('You have reached the maximum number of active tasks (24). Please wait for some tasks to complete.');
        }
        if (error.response?.status === 402) {
          throw new Error('Insufficient credits. Please add credits to your Flux account.');
        }
        const message = error.response?.data?.message || error.message;
        throw new Error(`Flux API error: ${message}`);
      }
      throw error;
    }
  }

  console.error('[Flux] Timeout reached');
  throw new Error('Timeout: Image generation took too long');
}

export async function generateImage(prompt: string): Promise<string> {
  if (!import.meta.env.VITE_FLUX_API_KEY) {
    throw new Error('Flux API key is not configured');
  }

  try {
    console.log('[Flux] Starting image generation with prompt:', prompt);

    // Initial request to generate image
    const response = await axios.post<{ id: string }>(
      `${FLUX_API_URL}/flux-pro-1.1`, // Using the latest pro model
      {
        prompt,
        negative_prompt: "blurry, low-quality, cartoon, unrealistic, watermark, text, signature",
        width: 1024,
        height: 1024
      },
      {
        headers: {
          'X-Key': import.meta.env.VITE_FLUX_API_KEY,
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.id) {
      console.error('[Flux] No task ID received');
      throw new Error('No task ID received from Flux API');
    }

    console.log('[Flux] Task created with ID:', response.data.id);

    // Poll for result
    return await checkResult(response.data.id);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Flux] Request Error:', {
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid Flux API key');
      }
      if (error.response?.status === 429) {
        throw new Error('You have reached the maximum number of active tasks (24). Please wait for some tasks to complete.');
      }
      if (error.response?.status === 402) {
        throw new Error('Insufficient credits. Please add credits to your Flux account.');
      }
      const message = error.response?.data?.message || error.message;
      throw new Error(`Flux API error: ${message}`);
    }
    throw error;
  }
}