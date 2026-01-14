import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/contexts/useWallet';
import { Network, AlertTriangle, Loader2 } from 'lucide-react';
import { NETWORK_CONFIG, getCurrentNetworkConfig, EXPECTED_CHAIN_ID } from '@/services/contractService';

interface NetworkSwitchProps {
  showFullAlert?: boolean;
}

export function NetworkSwitch({ showFullAlert = false }: NetworkSwitchProps) {
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

  const currentNetworkConfig = currentChainId ? getCurrentNetworkConfig(currentChainId) : null;

  const handleSwitchNetwork = async () => {
    const success = await switchNetwork();
    if (!success) {
      console.error('Failed to switch network');
    }
  };

  // Show full alert for banner mode
  if (showFullAlert && !isCorrectNetwork) {
    return (
      <div className="space-y-2">
        <Alert className="border-orange-500/20 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            <div className="space-y-1">
              <p>
                You are connected to the wrong network. Please switch to{' '}
                <strong>{NETWORK_CONFIG.chainName}</strong> (Chain ID {EXPECTED_CHAIN_ID}) to use this application.
              </p>
              {currentChainId && (
                <p className="text-xs text-muted-foreground">
                  Current network: Chain ID {currentChainId}
                  {currentNetworkConfig ? ` (${currentNetworkConfig.chainName})` : ' (Unknown)'}
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

  // Icon-only mode for header
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

  // Wrong network - red icon with hover tooltip
  return (
    <div className="relative group">
      <div 
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer"
      >
        <Network className="h-4 w-4 text-red-500" />
      </div>
      
      {/* Hover tooltip with switch button */}
      <div className="absolute top-full right-0 mt-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="bg-background border border-border rounded-lg shadow-lg p-4 space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-500">
              Wrong Network
            </p>
            <p className="text-xs text-muted-foreground">
              Please switch to <strong>{NETWORK_CONFIG.chainName}</strong> (Chain ID {EXPECTED_CHAIN_ID})
            </p>
            {currentChainId && (
              <p className="text-xs text-muted-foreground">
                Current: Chain ID {currentChainId}
                {currentNetworkConfig ? ` (${currentNetworkConfig.chainName})` : ' (Unknown)'}
              </p>
            )}
          </div>
          
          <Button
            onClick={handleSwitchNetwork}
            disabled={isSwitchingNetwork}
            className="w-full gap-2"
            variant="outline"
            size="sm"
          >
            {isSwitchingNetwork ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Network className="h-3 w-3" />
                Switch to {NETWORK_CONFIG.chainName}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
