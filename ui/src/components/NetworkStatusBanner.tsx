import { useWallet } from '@/contexts/useWallet';
import { NetworkSwitch } from './NetworkSwitch';

export function NetworkStatusBanner() {
  const { isConnected, isCorrectNetwork } = useWallet();

  if (!isConnected || isCorrectNetwork) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 w-full border-b border-orange-500/20 bg-orange-500/10 backdrop-blur">
      <div className="container mx-auto px-4 py-3">
        <NetworkSwitch showFullAlert={true} />
      </div>
    </div>
  );
}
