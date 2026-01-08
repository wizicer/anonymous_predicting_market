import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { useWallet } from '@/contexts/useWallet';
import type { Market } from '@/types';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, FileKey, Loader2, Users } from 'lucide-react';
import { getAllMarkets, joinCommittee, activateMarket } from '@/services/contractService';
import {
  getDkgCoordinator,
  removeDkgCoordinator,
  type DkgState,
  type DkgStatus,
} from '@/services/dkgCoordinator';
import { randScalar, mul, type Point } from '@/services/dkg';
import { getEffectiveStatus } from '@/lib/marketStatus';

type LoadingStates = Record<string, boolean>;

// DKG state per market
interface MarketDkgState {
  status: DkgStatus;
  connectedPeers: number;
  publicKey: Point | null;
  error: string | null;
}

export function CommitteeKeyGenerationPage() {
  const { address } = useWallet();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dkgStates, setDkgStates] = useState<Record<string, MarketDkgState>>({});
  const [commitments, setCommitments] = useState<Record<string, string>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dkgCoordinatorsRef = useRef<Map<string, ReturnType<typeof getDkgCoordinator>>>(new Map());

  const loadMarkets = useCallback(async () => {
    try {
      const allMarkets = await getAllMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error('Failed to load markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    
    // Poll for market updates every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadMarkets();
    }, 5000);

    // Capture ref value for cleanup
    const coordinatorsMap = dkgCoordinatorsRef.current;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Cleanup DKG coordinators
      for (const [marketId] of coordinatorsMap) {
        removeDkgCoordinator(marketId);
      }
    };
  }, [loadMarkets]);

  const preparingMarkets: Market[] = markets.filter(m => getEffectiveStatus(m) === 'preparing');

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Start DKG process for a market when minimum committee is reached
  const startDkgForMarket = useCallback((market: Market) => {
    if (!address) return;
    if (dkgCoordinatorsRef.current.has(market.id)) return;
    
    // Check if we're a committee member
    const isJoined = market.committee.some(
      m => m.address.toLowerCase() === address.toLowerCase()
    );
    if (!isJoined) return;
    
    // Check if minimum committee reached
    if (market.committee.length < market.requiredCommittee) return;
    
    // Get our commitment
    const myCommitment = commitments[market.id] || '0x0';
    
    console.log('[CommitteeKeyGenerationPage] Starting DKG for market:', market.id);
    
    const coordinator = getDkgCoordinator(
      market.id,
      address,
      myCommitment,
      market.minimumCommittee
    );
    
    dkgCoordinatorsRef.current.set(market.id, coordinator);
    
    // Subscribe to state changes
    coordinator.onStateChange((state: DkgState) => {
      setDkgStates(prev => ({
        ...prev,
        [market.id]: {
          status: state.status,
          connectedPeers: state.connectedPeers,
          publicKey: state.publicKey,
          error: state.error,
        },
      }));
      
      if (state.status === 'complete') {
        toast.success('DKG completed!', {
          description: `Public key generated for market ${market.id}`,
        });
      } else if (state.status === 'error') {
        toast.error('DKG failed', {
          description: state.error || 'Unknown error',
        });
      }
    });
    
    // Start the DKG process
    coordinator.start().catch(err => {
      console.error('[CommitteeKeyGenerationPage] DKG start failed:', err);
    });
  }, [address, commitments]);

  // Auto-start DKG when conditions are met
  useEffect(() => {
    for (const market of preparingMarkets) {
      const isJoined = market.committee.some(
        m => m.address.toLowerCase() === address?.toLowerCase()
      );
      const hasMinCommittee = market.committee.length >= market.requiredCommittee;
      
      if (isJoined && hasMinCommittee && !dkgCoordinatorsRef.current.has(market.id)) {
        startDkgForMarket(market);
      }
    }
  }, [preparingMarkets, address, startDkgForMarket]);

  const handleJoinCommittee = async (marketId: string) => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }

    setLoading(`join-${marketId}`, true);
    try {
      // Generate a random scalar as commitment (this will be used in DKG)
      const commitment = randScalar();
      const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0');
      
      // Store commitment for later use in DKG
      setCommitments(prev => ({ ...prev, [marketId]: commitmentHex }));
      
      await joinCommittee(BigInt(marketId), commitment);
      
      toast.success('Joined committee successfully!');
      await loadMarkets();
    } catch (error) {
      console.error('Failed to join committee:', error);
      toast.error('Failed to join committee', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(`join-${marketId}`, false);
    }
  };

  const handleProvePublicKey = async (marketId: string) => {
    setLoading(`prove-${marketId}`, true);
    try {
      // Get the public key from DKG state
      const dkgState = dkgStates[marketId];
      let pkX: string, pkY: string, pkCommitment: string;
      
      if (dkgState?.publicKey) {
        // Use the DKG-generated public key
        pkX = '0x' + dkgState.publicKey[0].toString(16).padStart(64, '0');
        pkY = '0x' + dkgState.publicKey[1].toString(16).padStart(64, '0');
        // Compute commitment as hash of public key (simplified)
        const pkHash = dkgState.publicKey[0] ^ dkgState.publicKey[1];
        pkCommitment = '0x' + pkHash.toString(16).padStart(64, '0');
      } else {
        // Fallback: generate a random public key for testing
        console.warn('[CommitteeKeyGenerationPage] No DKG public key, using random');
        const sk = randScalar();
        const pk = mul(sk);
        pkX = '0x' + pk[0].toString(16).padStart(64, '0');
        pkY = '0x' + pk[1].toString(16).padStart(64, '0');
        const pkHash = pk[0] ^ pk[1];
        pkCommitment = '0x' + pkHash.toString(16).padStart(64, '0');
      }
      
      await activateMarket(BigInt(marketId), pkX, pkY, pkCommitment);
      
      toast.success('Market activated!', {
        description: 'Public key has been set and market is now active.',
      });
      
      // Cleanup DKG coordinator
      removeDkgCoordinator(marketId);
      dkgCoordinatorsRef.current.delete(marketId);
      
      await loadMarkets();
    } catch (error) {
      console.error('Failed to activate market:', error);
      toast.error('Failed to activate market', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(`prove-${marketId}`, false);
    }
  };

  // Get DKG status display
  const getDkgStatusDisplay = (marketId: string): { text: string; color: string } => {
    const state = dkgStates[marketId];
    if (!state) return { text: 'Waiting', color: 'text-muted-foreground' };
    
    switch (state.status) {
      case 'waiting_for_peers':
        return { text: 'Waiting for peers...', color: 'text-yellow-400' };
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-400' };
      case 'round1_commitments':
        return { text: 'Round 1: Commitments', color: 'text-blue-400' };
      case 'round2_shares':
        return { text: 'Round 2: Shares', color: 'text-blue-400' };
      case 'computing':
        return { text: 'Computing...', color: 'text-purple-400' };
      case 'complete':
        return { text: 'DKG Complete ✓', color: 'text-green-400' };
      case 'error':
        return { text: `Error: ${state.error}`, color: 'text-red-400' };
      default:
        return { text: 'Idle', color: 'text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <FileKey className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-400 mb-1">Threshold Encryption</p>
              <p className="text-muted-foreground">
                Committee members collaboratively generate a public key for encrypting bets.
                A threshold of members is required to decrypt after market expiration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markets List */}
      {preparingMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No markets currently in preparation phase
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {preparingMarkets.map(market => {
            const progress = (market.committee.length / (Number(market.requiredCommittee))) * 100;
            const isJoined = market.committee.some(
              m => m.address.toLowerCase() === address?.toLowerCase()
            );
            const isFull = market.committee.length === Number(market.requiredCommittee);
            const dkgStatus = getDkgStatusDisplay(market.id);
            const dkgState = dkgStates[market.id];

            const effectiveStatus = getEffectiveStatus(market);
            return (
              <Card key={market.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Link to={`/market/${market.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{market.question}</CardTitle>
                      </Link>
                      <CardDescription>
                        Expires: {formatDate(market.expiresAt)} •
                        Min Reputation: {market.requiredReputation}
                      </CardDescription>
                    </div>
                    <StatusBadge status={effectiveStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Committee Formation
                      </span>
                      <span>{market.committee.length} / {market.requiredCommittee}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* DKG Status */}
                  {isJoined && isFull && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">DKG Status:</span>
                      <span className={dkgStatus.color}>{dkgStatus.text}</span>
                      {dkgState?.connectedPeers !== undefined && dkgState.connectedPeers > 0 && (
                        <span className="text-muted-foreground">
                          ({dkgState.connectedPeers} peers connected)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Members */}
                  <div className="flex flex-wrap gap-2">
                    {market.committee.map((member, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        {truncateAddress(member.address)}
                        {member.keyShareSubmitted && (
                          <CheckCircle className="h-3 w-3 ml-1 text-green-400" />
                        )}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!isJoined && (
                      <Button
                        onClick={() => handleJoinCommittee(market.id)}
                        disabled={loadingStates[`join-${market.id}`] || isFull}
                      >
                        {loadingStates[`join-${market.id}`] && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Join as Committee
                      </Button>
                    )}

                    {isFull && (
                      <Button
                        onClick={() => handleProvePublicKey(market.id)}
                        disabled={loadingStates[`prove-${market.id}`] || dkgState?.status !== 'complete'}
                        className="ml-auto"
                      >
                        {loadingStates[`prove-${market.id}`] && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Prove Public Key
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
