import React, { useState, useEffect } from 'react';
import { getEastersCrypto, getWeb3 } from '../lib/eastersCrypto';
import { useAuth } from '../context/auth-context';
import { debugAuthState, setCryptoInvestorFlag } from '../utils/debugUtils';

export default function CryptoTest() {
  const [web3, setWeb3] = useState(null);
  const [eastersCrypto, setEastersCrypto] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [networkId, setNetworkId] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [contractName, setContractName] = useState('PARES Token');
  const [contractSymbol, setContractSymbol] = useState('PARES');
  const [loading, setLoading] = useState(false);
  const [tokenId, setTokenId] = useState(null);
  const [deployedContracts, setDeployedContracts] = useState([]);
  const [domain, setDomain] = useState('');
  const [domainData, setDomainData] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const { user, getUserRole } = useAuth();
  
  // Initialize Easter's Crypto
  useEffect(() => {
    const initCrypto = async () => {
      try {
        // Initialize Easter's Crypto
        const crypto = getEastersCrypto();
        setEastersCrypto(crypto);
        
        // Get Web3 instance
        const web3Instance = getWeb3();
        setWeb3(web3Instance);
        
        // Check if already connected
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await web3Instance.eth.getAccounts();
          if (accounts.length > 0) {
            setAccounts(accounts);
            setWalletConnected(true);
            
            // Get network info
            const networkId = await web3Instance.eth.net.getId();
            setNetworkId(networkId);
            
            // Set network name
            const networkName = getNetworkName(networkId);
            setNetworkName(networkName);
          }
        }
        
        // Load previously deployed contracts from localStorage
        const storedContracts = localStorage.getItem('deployedContracts');
        if (storedContracts) {
          setDeployedContracts(JSON.parse(storedContracts));
        }
      } catch (error) {
        console.error('Error initializing Easter\'s Crypto:', error);
      }
    };
    
    initCrypto();
  }, []);
  
  // Debug auth state
  useEffect(() => {
    if (user) {
      const authState = debugAuthState(user, getUserRole);
      console.log('Crypto Test Auth State:', authState);
    }
  }, [user, getUserRole]);
  
  // Get network name from network ID
  const getNetworkName = (networkId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      42: 'Kovan Testnet',
      1337: 'Ganache Local'
    };
    return networks[networkId] || `Unknown Network (${networkId})`;
  };
  
  // Connect wallet
  const connectWallet = async () => {
    if (!web3) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccounts(accounts);
      setWalletConnected(true);
      
      // Get network info
      const networkId = await web3.eth.net.getId();
      setNetworkId(networkId);
      setNetworkName(getNetworkName(networkId));
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };
  
  // Deploy a new token contract
  const deployContract = async () => {
    if (!eastersCrypto || !walletConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    setLoading(true);
    try {
      // Deploy new tokenization contract
      const result = await eastersCrypto.smartContractService.deployTokenizationContract(
        contractName,
        contractSymbol
      );
      
      if (result.success) {
        setContractAddress(result.contractAddress);
        
        // Add to deployed contracts list
        const newContract = {
          address: result.contractAddress,
          name: contractName,
          symbol: contractSymbol,
          timestamp: new Date().toISOString()
        };
        
        const updatedContracts = [...deployedContracts, newContract];
        setDeployedContracts(updatedContracts);
        
        // Store in localStorage
        localStorage.setItem('deployedContracts', JSON.stringify(updatedContracts));
        
        alert(`Contract deployed successfully: ${result.contractAddress}`);
      } else {
        alert('Failed to deploy contract: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deploying contract:', error);
      alert('Error deploying contract: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Mint a test property token
  const mintToken = async () => {
    if (!eastersCrypto || !contractAddress) {
      alert('Please deploy or enter a contract address');
      return;
    }
    
    setLoading(true);
    try {
      // Property details
      const propertyData = {
        address: "123 Test Street, Crypto City",
        beds: 3,
        baths: 2,
        sqft: 2000,
        description: "Test property for tokenization"
      };
      
      // Mock token URI
      const tokenURI = `https://example.com/metadata/${Date.now()}.json`;
      
      // Mint token
      const result = await eastersCrypto.tokenManager.mintPropertyToken(
        contractAddress,
        tokenURI,
        accounts[0], // recipient
        propertyData
      );
      
      if (result.success) {
        setTokenId(result.tokenId);
        alert(`Token minted successfully! Token ID: ${result.tokenId}`);
      } else {
        alert('Minting failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error minting token:', error);
      alert('Error minting token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Resolve domain
  const resolveDomain = async () => {
    if (!eastersCrypto || !domain) return;
    
    setLoading(true);
    try {
      const result = await eastersCrypto.domainResolver.resolveDomain(domain);
      setDomainData(result);
    } catch (error) {
      console.error('Error resolving domain:', error);
      setDomainData({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Easter's Crypto Integration Test</h1>
      
      {/* Connection Status */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Connection Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Easter's Crypto:</strong> {eastersCrypto ? '✅ Initialized' : '❌ Not Initialized'}</p>
            <p><strong>Web3:</strong> {web3 ? '✅ Connected' : '❌ Not Connected'}</p>
            <p><strong>Network:</strong> {networkName || 'Not Connected'}</p>
            <p><strong>Network ID:</strong> {networkId || 'Unknown'}</p>
          </div>
          <div>
            <p><strong>Wallet:</strong> {walletConnected ? '✅ Connected' : '❌ Not Connected'}</p>
            <p><strong>Account:</strong> {accounts.length > 0 ? accounts[0] : 'None'}</p>
            <p><strong>Role:</strong> {user && getUserRole ? getUserRole() : 'Unknown'}</p>
            
            {!walletConnected ? (
              <button 
                onClick={connectWallet}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Connect Wallet
              </button>
            ) : (
              <p className="mt-3 text-green-600 font-semibold">Wallet Connected ✅</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Role Testing */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Role Testing</h2>
        <div className="flex space-x-4">
          <button 
            onClick={() => setCryptoInvestorFlag(true)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Set Crypto Investor Role
          </button>
          <button 
            onClick={() => setCryptoInvestorFlag(false)}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Remove Crypto Investor Role
          </button>
        </div>
      </div>
      
      {/* Deploy Contract */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Deploy Token Contract</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contract Name</label>
            <input 
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contract Symbol</label>
            <input 
              type="text"
              value={contractSymbol}
              onChange={(e) => setContractSymbol(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <button 
          onClick={deployContract}
          disabled={loading || !walletConnected}
          className={`px-4 py-2 ${loading || !walletConnected ? 'bg-gray-400' : 'bg-blue-600'} text-white rounded`}
        >
          {loading ? 'Deploying...' : 'Deploy Contract'}
        </button>
      </div>
      
      {/* Contract Interaction */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Mint Property Token</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Contract Address</label>
          <input 
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="0x..."
          />
        </div>
        <button 
          onClick={mintToken}
          disabled={loading || !walletConnected || !contractAddress}
          className={`px-4 py-2 ${loading || !walletConnected || !contractAddress ? 'bg-gray-400' : 'bg-blue-600'} text-white rounded`}
        >
          {loading ? 'Minting...' : 'Mint Property Token'}
        </button>
        
        {tokenId !== null && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
            <p className="font-medium">Token minted successfully!</p>
            <p>Token ID: {tokenId.toString()}</p>
          </div>
        )}
      </div>
      
      {/* Domain Resolution */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Domain Resolution</h2>
        <div className="flex mb-4">
          <input 
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-grow p-2 border rounded-l"
            placeholder="example.eth"
          />
          <button 
            onClick={resolveDomain}
            disabled={loading || !domain}
            className={`px-4 py-2 ${loading || !domain ? 'bg-gray-400' : 'bg-blue-600'} text-white rounded-r`}
          >
            {loading ? 'Resolving...' : 'Resolve Domain'}
          </button>
        </div>
        
        {domainData && (
          <div className={`mt-4 p-3 rounded ${domainData.success ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
            <p className="font-medium">{domainData.success ? 'Domain resolved successfully!' : 'Domain resolution failed'}</p>
            {domainData.success ? (
              <>
                <p><strong>Address:</strong> {domainData.address}</p>
                {domainData.metadata && (
                  <div className="mt-2">
                    <p className="font-medium">Metadata:</p>
                    <pre className="bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(domainData.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p><strong>Error:</strong> {domainData.error}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Deployed Contracts */}
      {deployedContracts.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Deployed Contracts</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Symbol</th>
                <th className="p-2">Address</th>
                <th className="p-2">Deployed</th>
              </tr>
            </thead>
            <tbody>
              {deployedContracts.map((contract, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{contract.name}</td>
                  <td className="p-2">{contract.symbol}</td>
                  <td className="p-2 font-mono text-sm">{contract.address}</td>
                  <td className="p-2">{new Date(contract.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
