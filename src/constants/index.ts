import { Network } from '@injectivelabs/networks';

// Chain and network configuration
export const CHAIN_ID = 'injective-888';
export const NETWORK = Network.TestnetK8s;

// Default gas price and limit
export const DEFAULT_GAS_PRICE = 500000000;
export const DEFAULT_GAS_LIMIT = 100000;

// API endpoints
export const API_ENDPOINTS = {
  mainnet: 'https://api.injective.network',
  testnet: 'https://testnet.injective.network'
};

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_ADDRESS: 'fluxos_wallet_address',
  WALLET_TYPE: 'fluxos_wallet_type',
  WORKFLOWS: 'fluxos_workflows'
};

// Default workflow settings
export const DEFAULT_WORKFLOW = {
  name: 'New Workflow',
  nodes: [],
  edges: []
};
