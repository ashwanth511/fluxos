import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Get a text-only model
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Chat with the agent
export const chatWithAgent = async (
  agentTraits: any,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
) => {
  try {
    // Build the system prompt based on agent traits
    const systemPrompt = buildSystemPrompt(agentTraits);
    
    // Prepare the chat history
    const history = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Start a chat session
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        parts: [{ text: msg.content }]
      }))
    });
    
    // Generate a response
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();
    
    return response;
  } catch (error) {
    console.error('Error chatting with agent:', error);
    throw new Error('Failed to generate response from AI');
  }
};

// Build a system prompt based on agent traits
const buildSystemPrompt = (traits: any) => {
  return `
You are an AI agent representing a cryptocurrency token with the following traits:

Personality: ${traits.personality || 'Helpful and informative'}
Background: ${traits.background || 'You are an AI assistant for a cryptocurrency token.'}
Specialties: ${traits.specialties?.join(', ') || 'Cryptocurrency, blockchain technology'}
Interests: ${traits.interests?.join(', ') || 'Finance, technology, innovation'}
Communication Style: ${traits.communicationStyle || 'Professional and concise'}

Your goal is to represent this token, answer questions about it, and assist users with their inquiries.
Always stay in character and maintain your unique personality traits.
If asked about technical details you don't know, you can explain that you're focused on helping users understand the token's value and use cases.

Please respond to the user's message in a helpful and engaging way.
`;
};
