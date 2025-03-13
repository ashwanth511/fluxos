import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// Get the API key
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCej6Iyr0KGpID2pnKqB54elsTX6p5xHDc';

console.log('Checking Google API key...');

if (!API_KEY) {
  console.error('❌ ERROR: Google API Key is not set!');
  console.error('Please add GOOGLE_API_KEY=your_api_key to your .env file');
  process.exit(1);
} else {
  console.log(`✅ API Key found (length: ${API_KEY.length}, starts with: ${API_KEY.substring(0, 5)}...)`);
}

// Test the API key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

async function testApiKey() {
  try {
    console.log('Testing API key with a simple request...');
    const result = await model.generateContent('Hello, are you working?');
    const response = result.response.text();
    console.log('Response received:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));
    console.log('✅ API key is valid and working!');
    return true;
  } catch (error) {
    console.error('❌ ERROR: API key test failed!');
    console.error('Error details:', error.message);
    return false;
  }
}

testApiKey()
  .then(isValid => {
    if (!isValid) {
      console.error('Please check your API key and make sure it has access to the Gemini API.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 