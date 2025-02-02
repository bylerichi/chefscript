import { useState } from 'react';
import { Loader2, AlertCircle, FileCheck, FileWarning } from 'lucide-react';
import { checkPlagiarism } from '../lib/winston';
import { rewriteContent } from '../lib/openai';
import { supabase } from '../lib/supabase';

interface PlagiarismResult {
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
}

export default function HtmlPlagiarismChecker() {
  const [htmlContent, setHtmlContent] = useState('');
  const [excludedUrls, setExcludedUrls] = useState('');
  const [useBacklinks, setUseBacklinks] = useState(false);
  const [websiteDomain, setWebsiteDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [modifiedHtml, setModifiedHtml] = useState<string | null>(null);

  // Calculate text statistics from <p> tags only
  const getParagraphStats = () => {
    if (!htmlContent.trim()) {
      return { charCount: 0, wordCount: 0 };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const paragraphs = doc.getElementsByTagName('p');
    const paragraphText = Array.from(paragraphs).map(p => p.textContent || '').join('\n\n');
    
    return {
      charCount: paragraphText.length,
      wordCount: paragraphText.trim() === '' ? 0 : paragraphText.trim().split(/\s+/).length
    };
  };

  // Calculate required tokens based on word count
  const calculateRequiredTokens = (wordCount: number): number => {
    return Math.ceil(wordCount / 500) * 2;
  };

  // Get current word count and required tokens
  const { charCount, wordCount } = getParagraphStats();
  const requiredTokens = calculateRequiredTokens(wordCount);

  async function extractTextFromHtml(html: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const paragraphs = doc.getElementsByTagName('p');
    return Array.from(paragraphs).map(p => p.innerHTML).join('\n\n');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!htmlContent.trim()) return;

    setIsChecking(true);
    setError(null);
    setResult(null);
    setModifiedHtml(null);

    try {
      // Extract text from HTML
      const textContent = await extractTextFromHtml(htmlContent);
      
      if (!textContent) {
        throw new Error('No paragraph content found in the HTML');
      }

      // Process excluded URLs
      const excludedUrlsList = excludedUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

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

      // Check for plagiarism
      const plagiarismResult = await checkPlagiarism(textContent, excludedUrlsList);
      setResult(plagiarismResult);

      // Process content for backlinks if enabled, regardless of plagiarism score
      if (useBacklinks) {
        setIsRewriting(true);
        try {
          // Send to ChatGPT for backlink integration
          const rewrittenHtml = await rewriteContent(
            htmlContent,
            plagiarismResult.score > 0 ? plagiarismResult.matches.map(match => ({
              text: match.text,
              source: match.source
            })) : [],
            {
              websiteDomain,
              wordsPerLink: 500,
              maxLinks: Math.floor(plagiarismResult.stats.wordCount / 500)
            }
          );
          setModifiedHtml(rewrittenHtml);
        } catch (rewriteError) {
          console.error('Content processing error:', rewriteError);
          setError(rewriteError instanceof Error ? rewriteError.message : 'Failed to process content');
        } finally {
          setIsRewriting(false);
        }
      } else if (plagiarismResult.score > 0) {
        // Only rewrite if there's plagiarism and backlinks are not enabled
        setIsRewriting(true);
        try {
          const rewrittenHtml = await rewriteContent(
            htmlContent,
            plagiarismResult.matches.map(match => ({
              text: match.text,
              source: match.source
            }))
          );
          setModifiedHtml(rewrittenHtml);
        } catch (rewriteError) {
          console.error('Rewriting error:', rewriteError);
          setError(rewriteError instanceof Error ? rewriteError.message : 'Failed to rewrite content');
        } finally {
          setIsRewriting(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check plagiarism');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">HTML Plagiarism Checker</h2>
            <p className="text-gray-600 mt-1">
              Check and fix plagiarism in your HTML content
            </p>
          </div>
          {result?.score ? (
            result.score > 0.3 ? (
              <FileWarning className="h-8 w-8 text-red-500" />
            ) : (
              <FileCheck className="h-8 w-8 text-green-500" />
            )
          ) : (
            <AlertCircle className="h-8 w-8 text-gray-400" />
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste HTML Content
            </label>
            <div className="relative">
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary font-mono text-sm"
                placeholder="<article>&#10;  <h1>Your Article Title</h1>&#10;  <p>Your content here...</p>&#10;</article>"
                disabled={isChecking || isRewriting}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded-md border shadow-sm space-x-3">
                <span>{charCount.toLocaleString()} characters</span>
                <span>|</span>
                <span>{wordCount.toLocaleString()} words in paragraphs</span>
                <span>|</span>
                <span className="text-primary font-medium">{requiredTokens} tokens required</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excluded Websites (one URL per line)
            </label>
            <textarea
              value={excludedUrls}
              onChange={(e) => setExcludedUrls(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary font-mono text-sm"
              placeholder="https://example1.com&#10;https://example2.com"
              disabled={isChecking || isRewriting}
            />
            <p className="mt-1 text-sm text-gray-500">
              Content from these websites will be ignored during plagiarism checking
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useBacklinks"
                checked={useBacklinks}
                onChange={(e) => setUseBacklinks(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                disabled={isChecking || isRewriting}
              />
              <label htmlFor="useBacklinks" className="ml-2 text-sm text-gray-700">
                Add backlinks from your website
              </label>
            </div>

            {useBacklinks && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Website Domain
                </label>
                <input
                  type="text"
                  value={websiteDomain}
                  onChange={(e) => setWebsiteDomain(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="www.example.com"
                  disabled={isChecking || isRewriting}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter your website domain to add backlinks from your sitemap
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isChecking || isRewriting || !htmlContent.trim() || (useBacklinks && !websiteDomain.trim())}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Checking...
              </>
            ) : isRewriting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              'Check for Plagiarism'
            )}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Plagiarism Score</h3>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      result.score > 0.7
                        ? 'bg-red-500'
                        : result.score > 0.3
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${result.score * 100}%` }}
                  />
                </div>
                <span className="ml-4 font-medium">
                  {Math.round(result.score * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Word Analysis</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Total Words:</dt>
                    <dd>{result.stats.wordCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Plagiarized Words:</dt>
                    <dd>{result.stats.plagiarizedWords}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Credits</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Used:</dt>
                    <dd>{result.stats.creditsUsed}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Remaining:</dt>
                    <dd>{result.stats.creditsRemaining}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {result.matches.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-4">Matching Content</h3>
                <div className="space-y-4">
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <a
                          href={match.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {match.source}
                        </a>
                        <span className="text-sm font-medium bg-gray-200 px-2 py-1 rounded">
                          {Math.round(match.similarity * 100)}% Match
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{match.text}</p>
                      <dl className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <dt className="font-medium">Identical Words</dt>
                          <dd>{match.details.identical}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Similar Words</dt>
                          <dd>{match.details.similar}</dd>
                        </div>
                        <div>
                          <dt className="font-medium">Total Words</dt>
                          <dd>{match.details.total}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-green-50 rounded-lg">
                <p className="text-green-700">No plagiarism detected!</p>
              </div>
            )}

            {modifiedHtml && (
              <div>
                <h3 className="text-lg font-medium mb-4">Modified Content</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {modifiedHtml}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(modifiedHtml)}
                    className="mt-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}