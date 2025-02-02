import { checkPlagiarism } from './winston';

// Test text
const TEST_TEXT = `In this guide, we'll show you how to craft the best Lipton meatloaf. This classic recipe combines ground beef with Lipton Onion Soup Mix for a flavorful, juicy meatloaf that's sure to become a family favorite. Perfect for weeknight dinners or Sunday suppers, this easy-to-follow recipe delivers consistent results every time.`;

// Test function
async function testPlagiarismChecker() {
  console.log('Starting plagiarism check test...');
  console.log('API Key configured:', !!import.meta.env.VITE_WINSTON_API_KEY);
  
  try {
    console.log('Checking text:', TEST_TEXT);
    
    const result = await checkPlagiarism(TEST_TEXT);
    
    console.log('\nPlagiarism Check Results:');
    console.log('-------------------------');
    console.log('Plagiarism Score:', `${(result.score * 100).toFixed(2)}%`);
    console.log('Word Count:', result.stats.wordCount);
    console.log('Plagiarized Words:', result.stats.plagiarizedWords);
    console.log('Credits Used:', result.stats.creditsUsed);
    console.log('Credits Remaining:', result.stats.creditsRemaining);
    
    if (result.matches.length > 0) {
      console.log('\nMatching Sources:');
      result.matches.forEach((match, index) => {
        console.log(`\nMatch #${index + 1}:`);
        console.log(`Source: ${match.source}`);
        console.log(`Similarity: ${(match.similarity * 100).toFixed(2)}%`);
        console.log(`Matching Text: "${match.text}"`);
        console.log('Details:', {
          identical: match.details.identical,
          similar: match.details.similar,
          total: match.details.total
        });
      });
    } else {
      console.log('\nNo matching sources found.');
    }
    
    return result;
  } catch (error) {
    console.error('\nError during plagiarism check:');
    console.error('-------------------------');
    console.error('Message:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Run the test
testPlagiarismChecker()
  .then(() => console.log('\nTest completed successfully'))
  .catch(() => console.log('\nTest failed'));