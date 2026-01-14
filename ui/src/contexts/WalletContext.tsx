import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { WalletContext } from './WalletContextType';
import { switchNetwork, getCurrentChainId, EXPECTED_CHAIN_ID } from '@/services/contractService';

const WALLET_STORAGE_KEY = 'apm_wallet_address';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return;

    try {
      const chainId = await getCurrentChainId();
      const correct = chainId === EXPECTED_CHAIN_ID;
      setCurrentChainId(chainId);
      setIsCorrectNetwork(correct);
    } catch (error) {
      console.error('Failed to check network status:', error);
      setCurrentChainId(null);
      setIsCorrectNetwork(false);
    }
  }, []);

  // Restore wallet connection from localStorage and check network
  useEffect(() => {
    const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
    if (savedAddress) {
      setAddress(savedAddress);
    }
    checkNetworkStatus();
  }, [checkNetworkStatus]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(null);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      } else {
        setAddress(accounts[0]);
        localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Listen for chain changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setCurrentChainId(parseInt(chainId, 16));
      setIsCorrectNetwork(parseInt(chainId, 16) === EXPECTED_CHAIN_ID);
    };

    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to connect your wallet');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
        await checkNetworkStatus();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetworkStatus]);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }, []);

  const switchNetworkHandler = useCallback(async (): Promise<boolean> => {
    setIsSwitchingNetwork(true);
    try {
      const success = await switchNetwork();
      if (success) {
        await checkNetworkStatus();
      }
      return success;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [checkNetworkStatus]);

  const checkNetwork = useCallback(async () => {
    await checkNetworkStatus();
  }, [checkNetworkStatus]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        isCorrectNetwork,
        isSwitchingNetwork,
        currentChainId,
        connect,
        disconnect,
        switchNetwork: switchNetworkHandler,
        checkNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
