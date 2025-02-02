import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateRecipeList } from '../lib/openai';
import { supabase } from '../lib/supabase';

interface ExtractorOptions {
  count: 25 | 50 | 75 | 100;
}

export default function FeedSpyExtractor() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedRecipes, setExtractedRecipes] = useState<string | null>(null);
  const [options, setOptions] = useState<ExtractorOptions>({ count: 25 });
  const [userTokens, setUserTokens] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.xlsx')) {
      setError('Please upload an Excel file (.xls or .xlsx)');
      return;
    }

    setFile(selectedFile);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const requiredTokens = Math.ceil(options.count / 25);
    
    try {
      // Check if user has enough tokens
      const { data: userData, error: tokenError } = await supabase
        .from('users')
        .select('tokens')
        .single();
      
      if (tokenError) {
        setError('Failed to check token balance');
        return;
      }
      
      if (!userData || userData.tokens < requiredTokens) {
        setError(`Insufficient tokens. This operation requires ${requiredTokens} tokens.`);
        return;
      }

      setIsProcessing(true);
      setError(null);

      // Read the Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      if (!worksheet) {
        setError('Excel file is empty or invalid');
        return;
      }

      // Get column E data
      const columnE = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 }); // Column E
        const cell = worksheet[cellAddress];
        if (cell && cell.v) columnE.push(cell.v.toString());
      }

      if (columnE.length === 0) {
        setError('No data found in column E');
        return;
      }

      // Generate recipe list using OpenAI
      const recipes = await generateRecipeList(columnE.join('\n'), options.count);
      
      if (!recipes) {
        setError('Failed to generate recipe list');
        return;
      }

      setExtractedRecipes(recipes);

      // Deduct tokens
      const { error: deductError } = await supabase.rpc('deduct_user_tokens', {
        amount: requiredTokens
      });

      if (deductError) {
        setError('Failed to deduct tokens');
        return;
      }

      setUserTokens((prev) => prev !== null ? prev - requiredTokens : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">FeedSpy Extractor</h2>
            <p className="text-gray-600 mt-1">
              Extract recipe titles from Excel files
            </p>
          </div>
          <FileSpreadsheet className="h-8 w-8 text-gray-400" />
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
              Upload Excel File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md border-gray-300">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".xls,.xlsx"
                      disabled={isProcessing}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Excel files only (.xls or .xlsx)
                </p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected file: {file.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Recipes to Extract
            </label>
            <select
              value={options.count}
              onChange={(e) => setOptions({ count: Number(e.target.value) as ExtractorOptions['count'] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              disabled={isProcessing}
            >
              <option value={25}>25 recipes (1 token)</option>
              <option value={50}>50 recipes (2 tokens)</option>
              <option value={75}>75 recipes (3 tokens)</option>
              <option value={100}>100 recipes (4 tokens)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              'Extract Recipes'
            )}
          </button>
        </form>

        {extractedRecipes && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Extracted Recipes</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {extractedRecipes}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(extractedRecipes)}
                className="mt-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}