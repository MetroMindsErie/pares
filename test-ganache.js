import 'dotenv/config';
import { Web3 } from 'web3';

async function testConnection() {
  try {
    console.log('=== GANACHE CONNECTION TEST ===');
    console.log('RPC URL:', process.env.RPC_URL);
    
    // Connect to Ganache
    const web3 = new Web3(process.env.RPC_URL);
    
    // Get network info
    console.log('=== NETWORK INFO ===');
    const networkId = await web3.eth.net.getId();
    console.log('Network ID:', networkId);
    
    const isListening = await web3.eth.net.isListening();
    console.log('Network is listening:', isListening);
    
    // Get Ganache accounts
    console.log('\n=== GANACHE ACCOUNTS ===');
    const accounts = await web3.eth.getAccounts();
    console.log(`Found ${accounts.length} accounts`);
    
    if (accounts.length > 0) {
      // Show first 3 accounts with balances
      for (let i = 0; i < Math.min(3, accounts.length); i++) {
        const balance = await web3.eth.getBalance(accounts[i]);
        console.log(`Account ${i+1}: ${accounts[i]}`);
        console.log(`Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
      }
    } else {
      console.log('No accounts available in Ganache. Check your Ganache workspace.');
    }
    
    // Test private key
    console.log('\n=== PRIVATE KEY TEST ===');
    if (process.env.PRIVATE_KEY) {
      // Make sure the private key has the correct format
      let privateKey = process.env.PRIVATE_KEY;
      
      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        console.log('Account address from private key:', account.address);
        
        // Get balance for this account
        const balance = await web3.eth.getBalance(account.address);
        console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // See if this account matches any Ganache account
        const isGanacheAccount = accounts.some(acc => 
          acc.toLowerCase() === account.address.toLowerCase());
        console.log('Is this a Ganache account?', isGanacheAccount ? 'Yes' : 'No');
      } catch (e) {
        console.error('Error with private key:', e.message);
      }
    } else {
      console.error('No PRIVATE_KEY found in .env file');
    }
    
    console.log('\n=== TEST COMPLETE ===');
  } catch (error) {
    console.error('Error connecting to Ganache:', error);
    console.log('\nTROUBLESHOOTING TIPS:');
    console.log('1. Make sure Ganache is running');
    console.log('2. Check the RPC URL in your .env file (should match Ganache settings)');
    console.log('3. Ensure Ganache has accounts created');
    console.log('4. Try restarting Ganache and creating a new workspace');
  }
}

testConnection();
