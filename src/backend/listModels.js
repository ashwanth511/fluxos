import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the API key
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCej6Iyr0KGpID2pnKqB54elsTX6p5xHDc';

console.log('Checking available models...');

if (!API_KEY) {
  console.error('❌ ERROR: Google API Key is not set!');
  process.exit(1);
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);

// Try different model names
const modelNames = [
  'gemini-pro',
  'gemini-1.0-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'text-bison',
  'chat-bison'
];

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Hello, are you working?');
    const response = result.response.text();
    console.log(`✅ Model ${modelName} is available!`);
    console.log('Response:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));
    return true;
  } catch (error) {
    console.error(`❌ Model ${modelName} is not available.`);
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  let foundWorkingModel = false;
  
  for (const modelName of modelNames) {
    const isWorking = await testModel(modelName);
    if (isWorking) {
      foundWorkingModel = true;
      console.log(`\n✅ Use this model in your code: ${modelName}\n`);
    }
    console.log('-----------------------------------');
  }
  
  if (!foundWorkingModel) {
    console.error('\n❌ No working models found. Please check your API key permissions.');
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 