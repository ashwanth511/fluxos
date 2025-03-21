import TokenModel from '../models/TokenModel.js';
import AgentModel from '../models/AgentModel.js';

// Get all tokens with agents
export const getAllTokens = async () => {
  try {
    const tokens = await TokenModel.find()
      .populate('agent')
      .sort({ createdAt: -1 });
    return tokens;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }
};

// Get token by denom
export const getTokenByDenom = async (denom: string) => {
  try {
    const token = await TokenModel.findOne({ denom }).populate('agent');
    return token;
  } catch (error) {
    console.error('Error fetching token by denom:', error);
    throw error;
  }
};

// Get token by ID
export const getTokenById = async (id: string) => {
  try {
    const token = await TokenModel.findById(id).populate('agent');
    return token;
  } catch (error) {
    console.error('Error fetching token by ID:', error);
    throw error;
  }
};

// Get tokens by creator address
export const getTokensByCreator = async (creator: string) => {
  try {
    const tokens = await TokenModel.find({ creator })
      .populate('agent')
      .sort({ createdAt: -1 });
    return tokens;
  } catch (error) {
    console.error('Error fetching tokens by creator:', error);
    throw error;
  }
};

// Create token with agent
export const createTokenWithAgent = async (data: any) => {
  try {
    console.log('Creating token with data:', JSON.stringify(data, null, 2));
    
    // Check if we have token data
    if (!data.token && (!data.name || !data.symbol)) {
      throw new Error('Token data is required. Please provide token information.');
    }
    
    // Extract token data - handle both nested and flat structures
    const tokenData = data.token || data;
    
    console.log('Extracted token data:', JSON.stringify(tokenData, null, 2));
    
    // Validate required fields
    if (!tokenData.name) throw new Error('Token name is required');
    if (!tokenData.symbol) throw new Error('Token symbol is required');
    if (!tokenData.supply) throw new Error('Token supply is required');
    
    // Use creatorAddress if creator is not provided
    const creator = tokenData.creator || tokenData.creatorAddress || 'inj1demo';
    
    // Generate a mock transaction hash if not provided (for demo purposes)
    const txHash = tokenData.txHash || `mock_tx_${Date.now().toString(16)}`;
    
    // Validate denom format
    const denom = tokenData.denom || `factory/${creator}/${tokenData.symbol.toLowerCase()}`;
    if (!denom.startsWith('factory/')) {
      throw new Error('Invalid denom format. Must start with factory/');
    }

    // Create token
    const token = new TokenModel({
      name: tokenData.name,
      symbol: tokenData.symbol,
      denom: denom,
      supply: tokenData.supply,
      description: tokenData.description || '',
      imageUrl: tokenData.imageUrl || tokenData.image || '',
      creator: creator,
      txHash: txHash
    });
    
    await token.save();
    
    // Create agent with default traits if not provided
    const agent = new AgentModel({
      name: `${token.name} Agent`,
      description: `AI Agent for ${token.name} token`,
      tokenId: token._id,
      traits: {
        personality: data.agent?.personality || data.traits?.personality || 'Friendly and professional',
        background: data.agent?.background || data.traits?.background || `Expert in ${token.name} token and blockchain technology`,
        specialties: Array.isArray(data.agent?.specialties || data.traits?.specialties) 
          ? (data.agent?.specialties || data.traits?.specialties) 
          : ((data.agent?.specialties || data.traits?.specialties || 'Blockchain,Tokenomics').split(',').map((s: string) => s.trim())),
        interests: Array.isArray(data.agent?.interests || data.traits?.interests)
          ? (data.agent?.interests || data.traits?.interests)
          : ((data.agent?.interests || data.traits?.interests || 'DeFi,Technology').split(',').map((s: string) => s.trim())),
        communicationStyle: data.agent?.communicationStyle || data.traits?.communicationStyle || 'Professional and helpful',
        knowledgeDomains: Array.isArray(data.agent?.knowledgeDomains || data.traits?.knowledgeDomains)
          ? (data.agent?.knowledgeDomains || data.traits?.knowledgeDomains)
          : ((data.agent?.knowledgeDomains || data.traits?.knowledgeDomains || 'Blockchain,Finance').split(',').map((s: string) => s.trim()))
      }
    });
    
    await agent.save();
    
    // Return populated token
    const populatedToken = await TokenModel.findById(token._id).populate('agent');
    return { token: populatedToken, agent };
  } catch (error) {
    console.error('Error creating token with agent:', error);
    throw error;
  }
};
