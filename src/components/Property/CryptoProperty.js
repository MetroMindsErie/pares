import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// Remove chart.js imports since it's not installed
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useAuth } from '../../context/auth-context';

// Comment out ChartJS registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CryptoProperty = ({ propertyData, mlsData }) => {
  const [cryptoData, setCryptoData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenizedValue, setTokenizedValue] = useState(0);
  const [tokensAvailable, setTokensAvailable] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [selectedStablecoin, setSelectedStablecoin] = useState('usdc');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  
  const router = useRouter();
  const { user } = useAuth();
  
  // Supported stablecoins
  const stablecoins = [
    { id: 'usdc', name: 'USD Coin (USDC)', logo: '/images/crypto/usdc.svg' },
    { id: 'usdt', name: 'Tether (USDT)', logo: '/images/crypto/usdt.svg' },
    { id: 'dai', name: 'Dai (DAI)', logo: '/images/crypto/dai.svg' },
  ];

  // Debug effect - MOVED HERE to avoid hooks order issues
  useEffect(() => {
    console.log('CryptoProperty component mounted', { propertyData });
  }, [propertyData]);
  
  // Mock fetch of crypto data - replace with actual API call
  useEffect(() => {
    const fetchCryptoData = async () => {
      setLoading(true);
      try {
        // In production, replace with actual API calls to get crypto market data
        // Example: const response = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin');
        
        // Mock data for demonstration
        const mockCryptoData = {
          tokenPrice: 1.00, // 1 token = $1.00 (stablecoin)
          tokenSupply: propertyData?.price ? Math.floor(propertyData.price / 100) : 10000,
          tokensAvailable: propertyData?.price ? Math.floor(propertyData.price / 100) * 0.7 : 7000, // 70% available
          projectedApy: 9.5,
          stakingApy: 4.2,
          gasFeesEth: 0.002,
          gasFeesUsd: 3.84,
          tokenizedValue: propertyData?.price || 1000000,
          historicalOccupancy: 92,
          yearlyRentalYield: 7.8,
          monthlyRentalIncome: propertyData?.price ? (propertyData.price * 0.006) : 6000, // 0.6% monthly
          monthlyExpenses: propertyData?.price ? (propertyData.price * 0.002) : 2000, // 0.2% monthly
          appreciationRate: 4.2,
          tokenTransactionVolume: 234500,
          tokenHolders: 47,
        };
        
        // Calculate financial metrics
        const financialMetrics = {
          totalReturn: [12.4, 14.2, 10.8, 15.3, 13.9], // Last 5 years
          cashFlow: [5000, 5200, 5400, 5600, 5800, 6000], // Last 6 months
          appreciationTrend: [2.2, 3.1, 3.8, 4.0, 4.2, 4.5], // Last 6 years %
          expenseRatio: [35, 32, 30, 31, 28, 26], // Last 6 months %
          occupancyRate: [89, 94, 91, 96, 92, 95], // Last 6 months %
        };
        
        setCryptoData(mockCryptoData);
        setFinancialData(financialMetrics);
        setTokenizedValue(mockCryptoData.tokenizedValue);
        setTokensAvailable(mockCryptoData.tokensAvailable);
        setTokenPrice(mockCryptoData.tokenPrice);
      } catch (error) {
        console.error("Error fetching crypto data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCryptoData();
  }, [propertyData]);
  
  // Normalize the property data to handle different formats
  // MOVED OUTSIDE of hooks to prevent conditional hook calling
  const normalizePropertyData = (data) => {
    if (!data) return {
      address: 'Property Address Unavailable',
      city: 'Unknown',
      state: 'Unknown',
      zipCode: 'Unknown',
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      squareFeet: 0,
      yearBuilt: 0,
      description: 'No description available.'
    };
    
    // Handle different property data formats
    return {
      address: data.address || data.UnparsedAddress || 'Address Unavailable',
      city: data.city || 'Unknown',
      state: data.state || 'Unknown',
      zipCode: data.zipCode || 'Unknown',
      price: data.price || data.ListPrice || 350000,
      bedrooms: data.bedrooms || data.BedroomsTotal || 0,
      bathrooms: data.bathrooms || data.BathroomsTotalInteger || 0,
      squareFeet: data.squareFeet || data.LivingArea || 0,
      yearBuilt: data.yearBuilt || 0,
      description: data.description || data.PublicRemarks || 'No description available.',
      image: data.image || data.media || '/properties.jpg'
    };
  };
  
  // Use normalization here, after all hooks have been called
  const normalizedProperty = normalizePropertyData(propertyData || mlsData);
  
  // Connect to MetaMask wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request wallet connection
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        // Get the connected wallet address
        const address = accounts[0];
        setWalletAddress(address);
        setWalletConnected(true);
        
        // Add event listener for account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
          setWalletAddress(newAccounts[0]);
        });
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      alert("Please install MetaMask to use this feature!");
    }
  };
  
  // Calculate number of tokens user can purchase
  const calculateTokens = (amount) => {
    if (!amount || amount <= 0 || !tokenPrice) return 0;
    return (amount / tokenPrice).toFixed(2);
  };
  
  // Calculate investment amount based on tokens
  const handleInvestmentChange = (e) => {
    const value = parseFloat(e.target.value);
    setInvestmentAmount(value || 0);
  };
  
  // Handle stablecoin selection
  const handleStablecoinChange = (e) => {
    setSelectedStablecoin(e.target.value);
  };
  
  // Execute purchase (dummy function for now)
  const handlePurchase = async () => {
    if (!walletConnected) {
      alert("Please connect your wallet first!");
      return;
    }
    
    if (investmentAmount <= 0) {
      alert("Please enter a valid investment amount!");
      return;
    }
    
    // In a production environment, this would call a smart contract function
    alert(`Purchase initiated for ${calculateTokens(investmentAmount)} tokens using ${selectedStablecoin.toUpperCase()}!`);
  };

  // Return loading UI if data is still being fetched
  if (loading || !cryptoData || !financialData) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Comment out chart configuration for now
  const cashFlowChartData = {
    labels: ['6 mo ago', '5 mo ago', '4 mo ago', '3 mo ago', '2 mo ago', 'Last month'],
    datasets: [
      {
        label: 'Monthly Cash Flow ($)',
        data: financialData.cashFlow,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };
  
  const returnChartData = {
    labels: ['5Y ago', '4Y ago', '3Y ago', '2Y ago', 'Last Year'],
    datasets: [
      {
        label: 'Annual Return (%)',
        data: financialData.totalReturn,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Return some basic UI if all else fails
  if (!cryptoData && !propertyData && !normalizedProperty) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-4">Crypto Property View</h2>
        <p className="text-center">Property data is loading or unavailable.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-2xl">
      {/* Header Section - Property Overview */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              {propertyData.address || 'Property Address'}
            </h1>
            <p className="text-gray-300">{propertyData.city}, {propertyData.state} {propertyData.zipCode}</p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <span className="text-gray-400 text-sm">Tokenized Value</span>
            <h3 className="text-2xl font-bold text-green-400">${tokenizedValue.toLocaleString()}</h3>
          </div>
        </div>
      </div>
      
      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property Details & Images */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
            <img 
              src={propertyData.image || 'https://placehold.co/600x400/2d3748/f8fafc?text=Property+Image'} 
              alt="Property" 
              className="w-full h-64 object-cover rounded-md mb-4"
            />
            
            {/* Property Specifications */}
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Property Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Bedrooms</p>
                <p className="font-medium">{propertyData.bedrooms || mlsData?.bedrooms || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Bathrooms</p>
                <p className="font-medium">{propertyData.bathrooms || mlsData?.bathrooms || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Square Feet</p>
                <p className="font-medium">{propertyData.squareFeet || mlsData?.squareFeet || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Year Built</p>
                <p className="font-medium">{propertyData.yearBuilt || mlsData?.yearBuilt || 'N/A'}</p>
              </div>
            </div>
            
            {/* Property Description */}
            <h3 className="text-xl font-semibold mb-2 text-blue-300">Description</h3>
            <p className="text-gray-300 text-sm">{propertyData.description || 'No description available.'}</p>
          </div>
          
          {/* Crypto Investment Metrics */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Crypto Investment Metrics</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Token Price</p>
                <p className="font-semibold text-lg">${cryptoData.tokenPrice} <span className="text-xs text-green-400">Stablecoin</span></p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tokens Available</p>
                <p className="font-medium">{cryptoData.tokensAvailable.toLocaleString()} <span className="text-xs text-purple-400">of {cryptoData.tokenSupply.toLocaleString()}</span></p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Projected APY</p>
                <p className="font-medium text-green-400">{cryptoData.projectedApy}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Staking APY</p>
                <p className="font-medium text-blue-400">{cryptoData.stakingApy}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Gas Fees (Est.)</p>
                <p className="font-medium">{cryptoData.gasFeesEth} ETH <span className="text-gray-400 text-xs">(${cryptoData.gasFeesUsd})</span></p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Token Holders</p>
                <p className="font-medium">{cryptoData.tokenHolders}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Middle Column - Financial Data */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Financial Performance</h3>
            
            {/* Replace charts with simple data display until chart.js is installed */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Annual Return (%)</h4>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-center text-lg text-white">
                  Chart will appear here after installing chart.js
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {financialData.totalReturn.map((value, index) => (
                    <div key={index} className="p-2 bg-gray-800 rounded">
                      <p className="text-xs text-gray-400">Year {index + 1}</p>
                      <p className="text-lg text-blue-400">{value}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Cash Flow Data */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Monthly Cash Flow ($)</h4>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-center text-lg text-white">
                  Chart will appear here after installing chart.js
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-xs text-gray-400">6 mo ago</th>
                        <th className="px-2 py-1 text-xs text-gray-400">5 mo ago</th>
                        <th className="px-2 py-1 text-xs text-gray-400">4 mo ago</th>
                        <th className="px-2 py-1 text-xs text-gray-400">3 mo ago</th>
                        <th className="px-2 py-1 text-xs text-gray-400">2 mo ago</th>
                        <th className="px-2 py-1 text-xs text-gray-400">Last month</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {financialData.cashFlow.map((value, index) => (
                          <td key={index} className="px-2 py-1 text-center text-green-400">${value}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Key Investment Metrics */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Key Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Monthly Rental Income</p>
                <p className="font-medium text-green-400">${cryptoData.monthlyRentalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Monthly Expenses</p>
                <p className="font-medium text-red-400">${cryptoData.monthlyExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net Monthly Income</p>
                <p className="font-medium">${(cryptoData.monthlyRentalIncome - cryptoData.monthlyExpenses).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Annual Appreciation</p>
                <p className="font-medium">{cryptoData.appreciationRate}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Historical Occupancy</p>
                <p className="font-medium">{cryptoData.historicalOccupancy}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Rental Yield</p>
                <p className="font-medium">{cryptoData.yearlyRentalYield}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Token Transaction Volume</p>
                <p className="font-medium">${cryptoData.tokenTransactionVolume.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Token Liquidity</p>
                <p className="font-medium text-green-400">High</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Investment Interface */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Invest in This Property</h3>
            
            {/* Wallet Connection */}
            <div className="mb-6">
              {!walletConnected ? (
                <button
                  onClick={connectWallet}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                >
                  Connect MetaMask Wallet
                </button>
              ) : (
                <div className="bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-300 mb-1">Connected Wallet</p>
                  <p className="font-medium text-green-400 flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
              )}
            </div>
            
            {/* Investment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Investment Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={handleInvestmentChange}
                    className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {investmentAmount > 0 && (
                    <>You will receive approximately {calculateTokens(investmentAmount)} tokens</>
                  )}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Stablecoin
                </label>
                <select
                  value={selectedStablecoin}
                  onChange={handleStablecoinChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stablecoins.map(coin => (
                    <option key={coin.id} value={coin.id}>{coin.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handlePurchase}
                disabled={!walletConnected || investmentAmount <= 0}
                className={`w-full py-3 px-4 font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                  (!walletConnected || investmentAmount <= 0)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                Purchase Tokens
              </button>
            </div>
          </div>
          
          {/* Legal Information */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Legal & Regulatory</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <span className="font-medium text-blue-300">Tokenization Structure:</span> This property is tokenized through a SEC-compliant security token offering.
              </p>
              <p>
                <span className="font-medium text-blue-300">Ownership Rights:</span> Token holders receive fractional ownership rights proportional to their token amount.
              </p>
              <p>
                <span className="font-medium text-blue-300">Dividends:</span> Rental income is distributed monthly to token holders in proportion to ownership.
              </p>
              <p>
                <span className="font-medium text-blue-300">Governance:</span> Token holders have voting rights on major property decisions.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                This offering is available to accredited investors only. Please review the full legal documentation before investing. Cryptocurrency investments involve risks and may not be suitable for all investors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoProperty;
