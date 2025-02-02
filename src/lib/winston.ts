import axios from 'axios';
import { supabase } from './supabase';

// Get the API URL from environment variable or fallback to local development URL
const API_URL = import.meta.env.VITE_API_URL || '/api';
const WINSTON_ENDPOINT = `${API_URL}/plagiarism`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TIMEOUT = 180000; // 3 minutes

function calculateRequiredTokens(wordCount: number): number {
  return Math.ceil(wordCount / 500) * 2;
}

export async function checkPlagiarism(
  text: string,
  excludedUrls: string[] = []
): Promise<{
  score: number;
  matches: Array<{
    text: string;
    source: string;
    similarity: number;
    details: {
      identical: number;
      similar: number;
      total: number;
    };
  }>;
  stats: {
    creditsUsed: number;
    creditsRemaining: number;
    wordCount: number;
    plagiarizedWords: number;
  };
}> {
  let retries = 0;

  // Validate input
  if (!text?.trim()) {
    throw new Error('Text is required for plagiarism check.');
  }

  // Calculate word count and required tokens
  const wordCount = text.trim().split(/\s+/).length;
  const requiredTokens = calculateRequiredTokens(wordCount);

  // Check if user has enough tokens
  const { data: userData, error: tokenError } = await supabase
    .from('users')
    .select('tokens')
    .single();

  if (tokenError) {
    throw new Error('Failed to check token balance');
  }

  if (!userData || userData.tokens < requiredTokens) {
    throw new Error(`Insufficient tokens. This check requires ${requiredTokens} tokens based on word count (${wordCount} words).`);
  }

  while (retries < MAX_RETRIES) {
    try {
      const response = await axios.post(
        WINSTON_ENDPOINT,
        { 
          text,
          excludedUrls: excludedUrls.filter(url => url && url.trim().length > 0)
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: TIMEOUT
        }
      );

      // Deduct tokens after successful check
      const { error: deductError } = await supabase.rpc('deduct_user_tokens', {
        amount: requiredTokens
      });

      if (deductError) {
        throw new Error('Failed to deduct tokens');
      }

      return {
        score: response.data.score / 100,
        matches: response.data.sources.map(source => ({
          text: source.plagiarismFound.map(found => found.sequence).join(' '),
          source: source.url,
          similarity: source.score / 100,
          details: {
            identical: source.identicalWordCounts,
            similar: source.similarWordCounts,
            total: source.totalNumberOfWords,
          },
        })),
        stats: {
          creditsUsed: response.data.credits_used,
          creditsRemaining: response.data.credits_remaining,
          wordCount: response.data.textWordCounts,
          plagiarizedWords: response.data.totalPlagiarismWords,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.error(`Request failed with status ${status}, attempt ${retries + 1}/${MAX_RETRIES}`);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('The plagiarism check is taking longer than expected. Please try with a smaller text or try again later.');
        }

        if (status === 401 || status === 402) {
          throw new Error(error.response?.data?.message || error.message);
        }

        if (retries < MAX_RETRIES - 1) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('Failed to check plagiarism after multiple retries.');
}