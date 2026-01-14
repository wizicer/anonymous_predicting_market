import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/contexts/useWallet';
import { Network, AlertTriangle, Loader2 } from 'lucide-react';
import { NETWORK_CONFIG } from '@/services/contractService';

export function NetworkSwitch() {
  const { 
    isCorrectNetwork, 
    isSwitchingNetwork, 
    currentChainId, 
    switchNetwork,
    isConnected 
  } = useWallet();

  if (!isConnected) {
    return null;
  }

  if (isCorrectNetwork) {
    return (
      <div 
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20"
        title={NETWORK_CONFIG.chainName}
      >
        <Network className="h-4 w-4 text-green-500" />
      </div>
    );
  }

  const handleSwitchNetwork = async () => {
    const success = await switchNetwork();
    if (!success) {
      console.error('Failed to switch network');
    }
  };

  return (
    <div className="space-y-2">
      <Alert className="border-orange-500/20 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-sm">
          <div className="space-y-1">
            <p>
              You are connected to the wrong network. Please switch to{' '}
              <strong>{NETWORK_CONFIG.chainName}</strong> to use this application.
            </p>
            {currentChainId && (
              <p className="text-xs text-muted-foreground">
                Current network: Chain ID {currentChainId}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
      
      <Button
        onClick={handleSwitchNetwork}
        disabled={isSwitchingNetwork}
        className="w-full gap-2"
        variant="outline"
      >
        {isSwitchingNetwork ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Switching Network...
          </>
        ) : (
          <>
            <Network className="h-4 w-4" />
            Switch to {NETWORK_CONFIG.chainName}
          </>
        )}
      </Button>
    </div>
  );
}
