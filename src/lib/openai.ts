import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_CHUNK_LENGTH = 12000; // Maximum characters per chunk for GPT-4

interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface BacklinkOptions {
  websiteDomain: string;
  wordsPerLink: number;
  maxLinks: number;
}

// Helper function to split HTML content into chunks
function splitHtmlContent(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs = Array.from(doc.getElementsByTagName('p'));
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const p of paragraphs) {
    const pHtml = p.outerHTML;
    
    // If adding this paragraph would exceed chunk size, start new chunk
    if (currentChunk.length + pHtml.length > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = pHtml;
    } else {
      currentChunk += pHtml;
    }
  }
  
  // Add final chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Helper function to process a single chunk
async function processChunk(
  chunk: string,
  plagiarizedSections: Array<{ text: string; source: string }>,
  backlinkOptions?: BacklinkOptions,
  chunkIndex: number = 0,
  totalChunks: number = 1
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  // Filter plagiarized sections relevant to this chunk
  const relevantSections = plagiarizedSections.filter(section => 
    chunk.includes(section.text)
  );

  const prompt = `
Process this chunk (${chunkIndex + 1}/${totalChunks}) of an HTML article. ${
  backlinkOptions 
    ? `Instructions:
${plagiarizedSections.length > 0 
  ? '1. Rewrite any plagiarized sections found in this chunk\n2. ' 
  : ''
}Add contextually relevant backlinks from ${backlinkOptions.websiteDomain}
- Space links evenly (aim for one link per ${backlinkOptions.wordsPerLink} words in this chunk)
- Use the sitemap at ${backlinkOptions.websiteDomain}/post-sitemap.xml
- Choose relevant anchor text
- Do not place links in the first paragraph of the article
- Only link to topically related content`
    : 'Rewrite any plagiarized sections while maintaining style and structure.'
}

Content chunk:
${chunk}

${relevantSections.length > 0 ? `
Plagiarized sections in this chunk:
${relevantSections.map((section, index) => `
[Match ${index + 1}]
${section.text}
Source: ${section.source}
`).join('\n')}
` : ''}

Rules:
${relevantSections.length > 0 ? '- Rewrite the plagiarized sections\n' : ''}- Preserve all HTML tags and structure
- Maintain the original writing style and tone
- Ensure content is unique and original
${backlinkOptions ? `- Add contextually relevant backlinks
- Use natural anchor text
- Ensure links fit the context` : ''}

Return Format:
Return only the processed HTML content, maintaining all original tags and structure.`;

  const response = await axios.post<ChatGPTResponse>(
    OPENAI_API_URL,
    {
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional content writer and SEO expert who specializes in creating unique, engaging content with appropriate backlinks when requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data?.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI');
  }

  return response.data.choices[0].message.content.trim();
}

export async function generateRecipe(recipeName: string): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `
Create a detailed recipe for "${recipeName}" following this EXACT format with all sections:

[TITLE]
${recipeName}

[DESCRIPTION]
Write 2-3 compelling sentences about the dish.

[INGREDIENTS]
List all ingredients with exact measurements.

[INSTRUCTIONS]
Provide clear step-by-step cooking instructions.

[TOP_VIEW_PROMPT]
Write a detailed prompt for AI image generation describing how the finished dish should look from above.

[MACRO_PROMPT]
Write a detailed prompt for AI image generation describing a close-up shot of the dish.

[HASHTAGS]
List 5-7 relevant hashtags.

IMPORTANT:
- Include ALL sections with their exact markers
- Keep the [TITLE] exactly as provided
- Make descriptions engaging but concise
- Use metric measurements
- Include cooking times and temperatures
- Focus on visual details in image prompts
- Make hashtags relevant and trending
- Maintain the exact format with section markers`;

    const response = await axios.post<ChatGPTResponse>(
      OPENAI_API_URL,
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional recipe writer and food photographer. Always maintain the exact format with all section markers ([TITLE], [DESCRIPTION], etc.) and include all required sections.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = response.data.choices[0].message.content;

    // Verify all sections are present
    const requiredSections = ['TITLE', 'DESCRIPTION', 'INGREDIENTS', 'INSTRUCTIONS', 'TOP_VIEW_PROMPT', 'MACRO_PROMPT', 'HASHTAGS'];
    const missingSections = requiredSections.filter(section => !content.includes(`[${section}]`));

    if (missingSections.length > 0) {
      throw new Error(`Missing required sections: ${missingSections.join(', ')}`);
    }

    return content;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`OpenAI API error: ${message}`);
    }
    throw error;
  }
}

export async function generateRecipeList(
  feedspyData: string,
  count: number
): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `
Analyze the following FeedSpy data and generate ${count} unique recipe ideas that would appeal to the same audience. Format the output as a simple list of recipe names, one per line.

FeedSpy Data:
${feedspyData}

Rules:
- Generate exactly ${count} recipes
- Each recipe should be unique
- Keep names concise but descriptive
- Focus on trending and popular recipes
- Consider seasonal ingredients
- One recipe per line
- No numbers or bullet points
`;

    const response = await axios.post<ChatGPTResponse>(
      OPENAI_API_URL,
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional recipe developer who specializes in creating trending recipe content for social media.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`OpenAI API error: ${message}`);
    }
    throw error;
  }
}

export async function rewriteContent(
  html: string,
  plagiarizedSections: Array<{
    text: string;
    source: string;
  }>,
  backlinkOptions?: BacklinkOptions
): Promise<string> {
  try {
    // Split content into chunks
    const chunks = splitHtmlContent(html);
    
    // Process all chunks in parallel
    const processedChunks = await Promise.all(
      chunks.map((chunk, index) => 
        processChunk(chunk, plagiarizedSections, backlinkOptions, index, chunks.length)
      )
    );
    
    // Combine processed chunks
    return processedChunks.join('\n');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`OpenAI API error: ${message}`);
    }
    throw error;
  }
}