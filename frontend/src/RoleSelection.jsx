import React, { useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  GANACHE_CHAIN_ID, 
  GANACHE_URL, 
  CONTRACT_ADDRESSES, 
  PRODUCT_NFT_ABI, 
  PRODUCT_REGISTRY_ABI, 
  TRACKING_ABI, 
  ConnectionStatus 
} from './Constants'; 

const RoleSelection = ({ 
  role, 
  setRole, 
  account, 
  setAccount, 
  setContracts, 
  connectionStatus, 
  setConnectionStatus 
}) => {

  const initializeContracts = useCallback(async (signer) => {
    try {
      const productNFT = new ethers.Contract(
        CONTRACT_ADDRESSES.ProductNFT,
        PRODUCT_NFT_ABI,
        signer
      );
      
      const productRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.ProductRegistry,
        PRODUCT_REGISTRY_ABI,
        signer
      );
      
      const tracking = new ethers.Contract(
        CONTRACT_ADDRESSES.Tracking,
        TRACKING_ABI,
        signer
      );

      setContracts({
        productNFT,
        productRegistry,
        tracking
      });
      return true;
    } catch (error) {
      console.error('Contract initialization failed:', error);
      throw new Error('Contract initialization failed');
    }
  }, [setContracts]);

  const switchToGanache = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: GANACHE_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        // Network not added, prompt to add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: GANACHE_CHAIN_ID,
            chainName: 'Ganache Local',
            rpcUrls: [GANACHE_URL],
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  const initializeWeb3 = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setConnectionStatus('no-metamask');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // 1. Request accounts (prompts MetaMask login/unlock)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0]; 
      
      // 2. Request switch to Ganache (throws if user denies or Ganache isn't running/configured)
      await switchToGanache();
      
      // 3. Instantiate Provider with ENS fix (Crucial for ethers v6 on Ganache 1337)
      const ganacheNetwork = new ethers.Network(
          'Ganache Local',
          // Note: GANACHE_CHAIN_ID must be a hex string like '0x539' (1337) for request,
          // but ethers.js Network constructor expects a number, so we parse it.
          parseInt(GANACHE_CHAIN_ID, 16) 
      );
      ganacheNetwork.ensAddress = null; // 👈 FIXES THE ENS ERROR

      const provider = new ethers.BrowserProvider(window.ethereum, ganacheNetwork);
      const signer = await provider.getSigner();

      // 4. Verify network actually is Ganache 1337 after switch
      const { chainId: currentChainId } = await provider.getNetwork();
      
      if (currentChainId !== ganacheNetwork.chainId) {
        setConnectionStatus('error');
        throw new Error(`Connected to wrong network: expected ${ganacheNetwork.chainId}, got ${currentChainId}`);
      }

      // 5. Success
      setAccount(account); 
      await initializeContracts(signer);
      setConnectionStatus('connected');
        
    } catch (error) {
      console.error('Web3 Initialization Failed:', error);
      // More specific status based on the nature of the failure
      if (error.code === 4001) {
        setConnectionStatus('denied');
      } else {
        setConnectionStatus('error');
      }
    }
  }, [switchToGanache, initializeContracts, setAccount, setConnectionStatus]);

  useEffect(() => {
    initializeWeb3();
    
    // Optional: Re-run initialization if the account or chain changes in MetaMask
    const handleChainChanged = () => initializeWeb3();
    const handleAccountsChanged = () => initializeWeb3();

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [initializeWeb3]); 

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 backdrop-blur-md bg-opacity-70 border border-gray-700 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-white">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-green-400">
         Agritrade
        </h1>
        <p className="text-center text-gray-400 mb-6">Supply Chain Dashboard</p>
        
        <div className="mb-6 flex justify-center">
          <ConnectionStatus status={connectionStatus} />
        </div>
        
        {/* Specific error message based on connectionStatus */}
        {(connectionStatus === 'error' || connectionStatus === 'denied') && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-30 border border-red-800 rounded-lg">
            <p className="text-sm text-red-300">
              Connection failed. Ensure Ganache is running, MetaMask is unlocked, and you approved the connection.
              {connectionStatus === 'denied' && " (Permission denied by user)."}
            </p>
          </div>
        )}
        {connectionStatus === 'no-metamask' && (
          <div className="mb-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-300">
              MetaMask not detected. Please install the browser extension to connect.
            </p>
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Your Role
          </label>
          <select 
            className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-700 text-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!isConnected}
          >
            <option value="">Choose a role...</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        
        {account && (
          <div className="text-sm text-gray-400 text-center">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;