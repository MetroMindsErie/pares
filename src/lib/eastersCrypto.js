import { initEastersCrypto } from 'easters-crypto';

// Create a singleton instance
let eastersCryptoInstance = null;

/**
 * Initialize Easter's Crypto with Ganache configuration
 */
export function getEastersCrypto() {
  if (!eastersCryptoInstance) {
    eastersCryptoInstance = initEastersCrypto({
      blockchain: {
        network: process.env.NETWORK || 'development',
        rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:7545',
        privateKey: process.env.PRIVATE_KEY,
        chainId: parseInt(process.env.CHAIN_ID || '1337', 10),
        useCustomRpc: true // Use custom RPC instead of Infura
      },
      ipfs: {
        projectId: process.env.IPFS_PROJECT_ID,
        projectSecret: process.env.IPFS_PROJECT_SECRET
      },
      enableUI: true // Enable UI components
    });
    
    console.log('Easter\'s Crypto initialized with Ganache configuration');
  }
  
  return eastersCryptoInstance;
}

/**
 * Get Web3 instance from Easter's Crypto
 */
export function getWeb3() {
  const eastersCrypto = getEastersCrypto();
  return eastersCrypto.getWeb3();
}
