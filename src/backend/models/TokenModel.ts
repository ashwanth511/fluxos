import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  denom: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format: factory/${creator_address}/${token_symbol}
    validate: {
      validator: function(v: string) {
        return v.startsWith('factory/');
      },
      message: props => `${props.value} is not a valid factory denom!`
    }
  },
  supply: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  creator: {
    type: String,
    required: true,
    trim: true
  },
  txHash: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  price: {
    type: String,
    default: '0'
  },
  marketCap: {
    type: String,
    default: '0'
  },
  volume24h: {
    type: String,
    default: '0'
  },
  holders: {
    type: Number,
    default: 0
  },
  transactions: {
    type: Number,
    default: 0
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting associated agent
tokenSchema.virtual('agent', {
  ref: 'Agent',
  localField: '_id',
  foreignField: 'tokenId',
  justOne: true
});

const TokenModel = mongoose.model('Token', tokenSchema);

export default TokenModel;
