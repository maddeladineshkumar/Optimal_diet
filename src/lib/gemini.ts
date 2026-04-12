import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client
// Using the environment variable injected by Vite/AI Studio
export const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' 
});
