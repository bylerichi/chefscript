# ChefScript - AI-Powered Recipe Content Creation

ChefScript is a powerful web application that helps food bloggers generate engaging recipe content for social media platforms like Facebook, Pinterest, and Instagram.

## Features

- AI-powered recipe generation
- Custom style creation for images
- Template management for consistent branding
- Plagiarism checking
- FeedSpy data extraction
- Token-based credit system

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase
- OpenAI API
- Recraft AI
- Flux AI
- Winston API

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_URL=your-supabase-url
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_RECRAFT_API_KEY=your-recraft-api-key
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
VITE_FLUX_API_KEY=your-flux-api-key
VITE_WINSTON_API_KEY=your-winston-api-key
VITE_API_URL=your-api-url
```

## Deployment

This project is configured for deployment on Netlify:

1. Connect your GitHub repository to Netlify
2. Configure environment variables in Netlify's dashboard
3. Deploy using the following settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

## License

MIT License - See LICENSE file for details