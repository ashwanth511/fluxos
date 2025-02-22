import { useInjectiveAddress, WalletStrategy } from '@injectivelabs/wallet-ts';

const WalletConnector = () => {
    // This hook fetches the connected wallet's address
    const address = useInjectiveAddress();
    const walletStrategy = new WalletStrategy();

    const handleConnectWallet = async () => {
        try {
            await walletStrategy.connect();
        } catch (error) {
            console.error('Wallet connection failed:', error);
        }
    };

    return (
        <div>
            {address ? (
                <p>Connected Wallet: {address}</p>
            ) : (
                <button onClick={handleConnectWallet}>Connect Wallet</button>
            )}
        </div>
    );
};

export default WalletConnector; 