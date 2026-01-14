import { createContext } from 'react';

export interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  isSwitchingNetwork: boolean;
  currentChainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<boolean>;
  checkNetwork: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);
