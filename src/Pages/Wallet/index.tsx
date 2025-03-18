import { useEffect, useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Network } from '@injectivelabs/networks';
import { Button } from '../../components/ui/button';
import { ChevronRight } from 'lucide-react';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from '@/components/DockIcons';
import { 
  ChainRestAuthApi,
  ChainRestBankApi,
  IndexerGrpcAccountApi,
  getExplorerUrl,
  ChainGrpcWasmApi
} from '@injectivelabs/sdk-ts';

interface Transaction {
  hash: string;
  type: string;
  status: string;
  timestamp: number;
  amount?: string;
}

export default function WalletPage() {
  const { 
    isConnected, 
    address, 
    network,
    walletType,
    walletStrategy,
    balance
  } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (isConnected && address) {
        try {
          setLoading(true);
          
          // Get the appropriate endpoints based on network
          const grpcEndpoint = network === Network.Mainnet 
            ? 'https://grpc.injective.network' 
            : 'https://testnet.grpc.injective.network';

          // Initialize the gRPC API
          const accountApi = new IndexerGrpcAccountApi(grpcEndpoint);
          
          // Fetch recent transactions
          const response = await accountApi.fetchAccountTxs({
            address: address,
            limit: 10,
            skip: 0
          });

          if (response && response.transactions) {
            const formattedTxs = response.transactions.map(tx => ({
              hash: tx.hash,
              type: tx.messages[0]?.type || 'Transaction',
              status: tx.success ? 'Success' : 'Failed',
              timestamp: Number(tx.blockTimestamp) * 1000,
              amount: tx.value || '0 INJ'
            }));
            setTransactions(formattedTxs);
          }
        } catch (error) {
          console.error('Error fetching transactions:', error);
          setTransactions([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTransactions();
  }, [isConnected, address, network]);

  if (!isConnected) {
    return (
      <>
        <WalletConnect />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h1>
            <p className="text-gray-600">Please connect your wallet to view details</p>
          </div>
        </div>
        <DockIcons />
      </>
    );
  }

  const getExplorerLink = (hash: string) => {
    const baseUrl = network === Network.Mainnet 
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    return `${baseUrl}/transaction/${hash}`;
  };

  return (
    <>
      <WalletConnect/>
      <div className="container mx-auto px-4 py-25">
        <div className="max-w-4xl mx-auto">
          {/* Wallet Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Wallet Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="font-mono text-sm break-all">{address}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Network</label>
                  <p className="font-medium">
                    {network === Network.Mainnet ? 'Mainnet' : 'Testnet'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Wallet Type</label>
                  <p className="font-medium">{walletType}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Balance</label>
                  <p className="text-2xl font-bold">{balance} INJ</p>
                </div>
                {network === Network.Testnet && (
                  <div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.open('https://testnet.faucet.injective.network/', '_blank');
                      }}
                    >
                      Request Testnet Tokens
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
            {loading ? (
              <div className="text-center py-4">Loading transactions...</div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <a
                    key={tx.hash}
                    href={getExplorerLink(tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{tx.type}</p>
                      <p className="text-sm font-mono text-gray-500">{tx.hash}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium text-gray-900">{tx.amount}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No transactions found
              </div>
            )}
          </div>
        </div>
      </div>
      <DockIcons/>
    </>
  );
}