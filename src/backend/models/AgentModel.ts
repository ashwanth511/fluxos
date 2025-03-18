import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    required: true,
    unique: true // One agent per token
  },
  traits: {
    personality: {
      type: String,
      required: true,
      default: 'Friendly and professional'
    },
    background: {
      type: String,
      required: true,
      default: 'Expert in blockchain and tokenomics'
    },
    specialties: {
      type: [String],
      required: true,
      default: ['Blockchain', 'Tokenomics']
    },
    interests: {
      type: [String],
      required: true,
      default: ['DeFi', 'Technology']
    },
    communicationStyle: {
      type: String,
      required: true,
      default: 'Professional and helpful'
    },
    knowledgeDomains: {
      type: [String],
      required: true,
      default: ['Blockchain', 'Finance']
    }
  },
  conversations: [{
    userId: String,
    messages: [{
      role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting associated token
agentSchema.virtual('token', {
  ref: 'Token',
  localField: 'tokenId',
  foreignField: '_id',
  justOne: true
});

const AgentModel = mongoose.model('Agent', agentSchema);

export default AgentModel;
