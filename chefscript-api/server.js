#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to only allow requests from your Netlify domain in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN 
    : true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Winston API proxy endpoint
app.post('/api/plagiarism', async (req, res) => {
  try {
    const { text, excludedUrls = [] } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const apiKey = process.env.VITE_WINSTON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Winston API key is not configured' });
    }

    // Set a longer timeout for the Winston API request
    const response = await axios.post(
      'https://api.gowinston.ai/v2/plagiarism',
      { 
        text,
        excludedUrls: excludedUrls.filter(url => url && url.trim().length > 0)
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000, // 3 minutes
        maxContentLength: 10 * 1024 * 1024, // 10MB
        maxBodyLength: 10 * 1024 * 1024 // 10MB
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Plagiarism check error:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          message: 'Service is temporarily unavailable. Please try again later.' 
        });
      }

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return res.status(504).json({ 
          message: 'The request took too long to process. Please try with a smaller text or try again later.' 
        });
      }

      res.status(status).json({ message });
    } else {
      res.status(500).json({ 
        message: 'An unexpected error occurred. Please try again later.' 
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});