import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCej6Iyr0KGpID2pnKqB54elsTX6p5xHDc';
console.log('Google API Key available:', API_KEY ? 'Yes' : 'No');

const genAI = new GoogleGenerativeAI(API_KEY);

// Use gemini-1.5-pro which is confirmed to be available
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 800,
  }
});

// Chat with the agent
export const chatWithAgent = async (
  agentTraits: any,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
) => {
  try {
    // Check if API key is available
    if (!API_KEY) {
      throw new Error('Google API Key is not configured. Please set GOOGLE_API_KEY in your environment variables.');
    }

    // Build the system prompt based on agent traits
    const systemPrompt = buildSystemPrompt(agentTraits);
    
    console.log('Using system prompt:', systemPrompt);
    console.log('User message:', userMessage);
    
    // For Gemini, we need to use a different approach
    // First message should include the system prompt
    if (conversationHistory.length === 0) {
      try {
        // For first message, use direct generation with system prompt + user message
        const result = await model.generateContent({
          contents: [
            { 
              parts: [
                { text: systemPrompt },
                { text: "\n\nUser: " + userMessage }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
          },
        });
        
        return result.response.text();
      } catch (error) {
        console.error('Error in first message generation:', error);
        throw error;
      }
    } else {
      // For subsequent messages, we need to include the system prompt and conversation history
      try {
        // Combine system prompt with conversation history
        let fullPrompt = systemPrompt + "\n\n";
        
        // Add conversation history
        for (const msg of conversationHistory) {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          fullPrompt += `${role}: ${msg.content}\n`;
        }
        
        // Add current user message
        fullPrompt += `User: ${userMessage}`;
        
        console.log('Sending full prompt to model:', fullPrompt.substring(0, 200) + '...');
        
        const result = await model.generateContent({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
          },
        });
        
        return result.response.text();
      } catch (error) {
        console.error('Error in conversation generation:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error chatting with agent:', error);
    throw new Error('Failed to generate response from AI: ' + (error instanceof Error ? error.message : String(error)));
  }
};

// Build a system prompt based on agent traits
const buildSystemPrompt = (traits: any) => {
  // Extract token information
  const tokenName = traits.tokenName || 'this token';
  const tokenSymbol = traits.tokenSymbol || 'TOKEN';
  const tokenDescription = traits.tokenDescription || 'a cryptocurrency token';
  const tokenCreator = traits.tokenCreator || 'the creator';
  const tokenSupply = traits.tokenSupply || 'limited supply';
  
  return `
CRITICAL INSTRUCTION: You are the AI agent that EXCLUSIVELY represents the "${tokenName}" (${tokenSymbol}) token. You are NOT a general AI assistant.

YOUR IDENTITY: You ARE the official AI representative for ${tokenName} token. This is your ONLY role.

TOKEN DETAILS:
- Name: ${tokenName}
- Symbol: ${tokenSymbol}
- Description: ${tokenDescription}
- Creator: ${tokenCreator}
- Supply: ${tokenSupply}

YOUR PERSONALITY:
- Personality: ${traits.personality || 'Helpful and informative'}
- Background: ${traits.background || `You are the official AI representative for ${tokenName}`}
- Specialties: ${traits.specialties?.join(', ') || 'Cryptocurrency, blockchain technology'}
- Interests: ${traits.interests?.join(', ') || 'Finance, technology, innovation'}
- Communication Style: ${traits.communicationStyle || 'Professional and concise'}

MANDATORY RULES:
1. ALWAYS respond as if you ARE the ${tokenName} token's official AI agent
2. NEVER say you are not affiliated with ${tokenName} - you ARE the token's representative
3. NEVER break character under any circumstances
4. ONLY provide information about ${tokenName} token
5. If asked about other tokens or unrelated topics, politely redirect to ${tokenName}
6. Use your specific personality traits in all responses
7. NEVER acknowledge you are a general AI model - you are ONLY the ${tokenName} agent
8. If asked "are you the agent for ${tokenName}?" ALWAYS respond "Yes, I am the official AI agent for ${tokenName}"

EXAMPLE RESPONSES:
- If asked "Who are you?": "I am the official AI agent for ${tokenName} (${tokenSymbol}). I'm here to help you learn about our token and answer any questions you might have."
- If asked "Are you ChatGPT?": "No, I am the dedicated AI agent for ${tokenName} token. My purpose is to represent ${tokenName} and assist users with information about this specific token."
- If asked about another token: "As the ${tokenName} agent, I focus exclusively on providing information about ${tokenName}. Would you like to know more about our token's features or use cases?"

Your sole purpose is to represent ${tokenName}, answer questions about it, and assist users with their inquiries about THIS TOKEN ONLY.
`;
};
