import { type RecipeParts } from './types';

export interface RecipeParts {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  imagePrompt: string;
  macroPrompt: string;
  hashtags: string;
}

export function parseRecipeText(text: string): RecipeParts {
  try {
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // More robust section extraction with fallbacks
    const title = extractSection(normalizedText, 'TITLE') || 
      extractSection(normalizedText, 'Recipe Title') || 
      'Untitled Recipe';

    const description = extractSection(normalizedText, 'DESCRIPTION') || 
      extractSection(normalizedText, 'Description') || 
      'No description available.';

    const ingredients = extractSection(normalizedText, 'INGREDIENTS') || 
      extractSection(normalizedText, 'Ingredients List') || 
      'No ingredients listed.';

    const instructions = extractSection(normalizedText, 'INSTRUCTIONS') || 
      extractSection(normalizedText, 'Steps') || 
      extractSection(normalizedText, 'Method') || 
      'No instructions available.';

    const imagePrompt = extractSection(normalizedText, 'TOP_VIEW_PROMPT') || 
      extractSection(normalizedText, 'Image Description') || 
      'A beautifully plated dish from above';

    const macroPrompt = extractSection(normalizedText, 'MACRO_PROMPT') || 
      extractSection(normalizedText, 'Close-up Description') || 
      'A detailed close-up of the dish';

    const hashtags = extractSection(normalizedText, 'HASHTAGS') || 
      extractSection(normalizedText, 'Tags') || 
      '#food #recipe #cooking';

    return {
      title,
      description,
      ingredients,
      instructions,
      imagePrompt,
      macroPrompt,
      hashtags
    };
  } catch (error) {
    console.error('Recipe parsing error:', error);
    throw new Error(`Failed to parse recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractSection(text: string, marker: string): string {
  try {
    // Try exact marker first
    const exactPattern = new RegExp(`\\[${marker}\\]\\n(.*?)(?=\\n\\[|$)`, 's');
    const exactMatch = text.match(exactPattern);
    if (exactMatch?.[1]) {
      return exactMatch[1].trim();
    }

    // Try without brackets
    const loosePattern = new RegExp(`${marker}:?\\s*\\n(.*?)(?=\\n(?:[A-Z][A-Za-z ]+:?\\n)|$)`, 's');
    const looseMatch = text.match(loosePattern);
    if (looseMatch?.[1]) {
      return looseMatch[1].trim();
    }

    return '';
  } catch (error) {
    console.error(`Error extracting section [${marker}]:`, error);
    return '';
  }
}

// Function to create downloadable text content without section markers
export function createDownloadableText(recipe: RecipeParts): string {
  return `${recipe.title}

${recipe.description}

${recipe.ingredients}

${recipe.instructions}

${recipe.hashtags}`;
}