import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { useWallet } from '@/contexts/WalletContext';
import type { Market } from '@/types';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, FileKey, Loader2, Users } from 'lucide-react';
import { getAllMarkets, joinCommittee, activateMarket } from '@/services/contractService';

type LoadingStates = Record<string, boolean>;

export function CommitteeKeyGenerationPage() {
  const { address } = useWallet();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const allMarkets = await getAllMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error('Failed to load markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setIsLoading(false);
    }
  };

  const preparingMarkets: Market[] = markets.filter(m => m.status === 'preparing');

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const handleJoinCommittee = async (marketId: string) => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }

    setLoading(`join-${marketId}`, true);
    try {
      // Generate a random commitment for the key share
      const commitment = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      
      await joinCommittee(BigInt(marketId), commitment);
      
      toast.success('Joined committee successfully!');
      await loadMarkets(); // Refresh markets
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
      // For simplicity, generate mock public key values
      // In production, this would be computed from committee key shares
      const pkX = '0x' + '1'.padStart(64, '0');
      const pkY = '0x' + '2'.padStart(64, '0');
      const pkCommitment = '0x' + '3'.padStart(64, '0');
      
      await activateMarket(BigInt(marketId), pkX, pkY, pkCommitment);
      
      toast.success('Market activated!', {
        description: 'Public key has been set and market is now active.',
      });
      await loadMarkets(); // Refresh markets
    } catch (error) {
      console.error('Failed to activate market:', error);
      toast.error('Failed to activate market', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(`prove-${marketId}`, false);
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
            const progress = (market.committee.length / market.requiredCommittee) * 100;
            const isJoined = market.committee.some(
              m => m.address.toLowerCase() === address?.toLowerCase()
            );
            const isFull = market.committee.length >= market.requiredCommittee;

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
                    <StatusBadge status={market.status} />
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
                        disabled={loadingStates[`prove-${market.id}`]}
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
