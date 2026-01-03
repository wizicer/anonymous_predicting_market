import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { EncryptedIndicator } from '@/components/EncryptedIndicator';
import { ZkProofBadge } from '@/components/ZkProofBadge';
import { useWallet } from '@/contexts/WalletContext';
import { formatDate, formatAmount, truncateAddress, truncateHash, formatRelativeTime } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, TrendingUp, Users, Lock, 
  CheckCircle, XCircle, Shield, Key, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import type { Market } from '@/types';
import { getMarket, placeEncryptedBet } from '@/services/contractService';
import { getBetProof } from '@/services/provers/betProver';

export function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected, connect, address } = useWallet();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [betAmount, setBetAmount] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<'yes' | 'no' | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const quickAmounts = ['0.1', '0.5', '1', '2', '5'];

  useEffect(() => {
    if (id) {
      loadMarket();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadMarket = async () => {
    try {
      const marketData = await getMarket(BigInt(id!));
      setMarket(marketData);
    } catch (error) {
      console.error('Failed to load market:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Markets
          </Button>
        </Link>
      </div>
    );
  }

  const isResolved = market.status === 'resolved';
  const isPreparing = market.status === 'preparing';
  const isActive = market.status === 'active';
  const committeeProgress = (market.committee.length / market.requiredCommittee) * 100;

  const handlePlaceBet = async (mode: 'verified' | 'unverified') => {
    if (!selectedPosition || !betAmount || !address) return;
    
    if (mode === 'unverified') {
      toast.error('Only verified bets are supported');
      return;
    }
    
    setIsPlacingBet(true);
    try {
      // Generate proof using betProver
      const side = selectedPosition === 'yes' ? 1n : 0n;
      const amountWei = BigInt(Math.floor(parseFloat(betAmount) * 1e18));
      const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      const nonceKey = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      const addressBigInt = BigInt(address);
      
      // Mock public key for now (would come from market.publicKey)
      const PK: [bigint, bigint] = [1n, 2n];
      const comm = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      
      const proof = await getBetProof(
        PK,
        comm,
        amountWei,
        addressBigInt,
        salt,
        side,
        nonceKey
      );
      
      // Convert commitment and cypherText to bytes32
      const commitment = '0x' + comm.toString(16).padStart(64, '0');
      const cypherText = '0x' + proof.encryptedMessage[0].toString(16).padStart(64, '0');
      
      // Prepare public signals (6 elements)
      const publicSignals: bigint[] = [
        proof.encryptedMessage[0],
        proof.encryptedMessage[1],
        proof.ephemeralKey[0],
        proof.ephemeralKey[1],
        comm,
        0n
      ];
      
      await placeEncryptedBet(
        BigInt(id!),
        commitment,
        cypherText,
        proof.a,
        proof.b,
        proof.c,
        publicSignals,
        betAmount
      );
      
      toast.success(`Bet placed: ${betAmount} ETH on ${selectedPosition.toUpperCase()}`, {
        description: 'Your bet has been verified and submitted',
      });
      setBetAmount('');
      setSelectedPosition(null);
      await loadMarket();
    } catch (error) {
      console.error('Failed to place bet:', error);
      toast.error('Failed to place bet', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsPlacingBet(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Markets
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={market.status} />
          <span className="text-sm text-muted-foreground font-mono">
            {market.category.toUpperCase()}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{market.question}</h1>
        <p className="text-muted-foreground">{market.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Probability / Outcome */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isResolved ? 'Final Outcome' : isPreparing ? 'Committee Formation' : 'Market Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isResolved ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-400 font-medium">YES {market.yesPercentage}%</span>
                    <span className="text-red-400 font-medium">NO {market.noPercentage}%</span>
                  </div>
                  <div className="h-4 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-green-500" style={{ width: `${market.yesPercentage}%` }} />
                    <div className="bg-red-500" style={{ width: `${market.noPercentage}%` }} />
                  </div>
                  <div className="flex items-center justify-center gap-2 py-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    {market.outcome === 'yes' ? (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-400" />
                    )}
                    <span className={`text-xl font-bold ${market.outcome === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                      Resolved: {market.outcome?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : isPreparing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Awaiting Committee Members</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${committeeProgress}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {market.committee.length} / {market.requiredCommittee} members joined
                    (Minimum reputation: {market.requiredReputation})
                  </p>
                </div>
              ) : (
                <EncryptedIndicator showDescription />
              )}
            </CardContent>
          </Card>

          {/* Betting Panel */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  Place Encrypted Bet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <Button onClick={connect} className="w-full">
                    Connect Wallet to Bet
                  </Button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedPosition === 'yes' ? 'default' : 'outline'}
                        className={selectedPosition === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => setSelectedPosition('yes')}
                      >
                        YES
                      </Button>
                      <Button
                        variant={selectedPosition === 'no' ? 'default' : 'outline'}
                        className={selectedPosition === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={() => setSelectedPosition('no')}
                      >
                        NO
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (ETH)</Label>
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            size="sm"
                            variant={betAmount === amount ? 'secondary' : 'outline'}
                            onClick={() => setBetAmount(amount)}
                          >
                            {amount}
                          </Button>
                        ))}
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Button
                          className="w-full"
                          disabled={!selectedPosition || !betAmount || isPlacingBet}
                          onClick={() => handlePlaceBet('verified')}
                        >
                          {isPlacingBet ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4 mr-2" />
                          )}
                          {isPlacingBet ? 'Placing...' : 'Place Verified Bet'}
                        </Button>
                        <p className="text-[11px] leading-4 text-muted-foreground">
                          Requires proof generation (takes time) and costs more gas.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled={!selectedPosition || !betAmount}
                          onClick={() => handlePlaceBet('unverified')}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Place Unverified Bet
                        </Button>
                        <p className="text-[11px] leading-4 text-muted-foreground">
                          No proof required (faster) and costs less gas.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Your bet will be encrypted and hidden until resolution
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bets List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {isResolved ? 'Revealed Bets' : 'Encrypted Bets'}
                <span className="text-sm font-normal text-muted-foreground">
                  ({market.bets.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {market.bets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bets placed yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {market.bets.slice(0, 20).map((bet) => (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{truncateAddress(bet.bettor)}</span>
                          {bet.proof && <ZkProofBadge />}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {truncateHash(bet.commitment, 12)}
                        </span>
                      </div>
                      <div className="text-right">
                        {isResolved && bet.position ? (
                          <span className={`font-medium ${bet.position === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                            {bet.position.toUpperCase()}
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground">
                            <Lock className="h-4 w-4" />
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {bet.amount != null ? formatAmount(bet.amount) : '--'} ETH
                        </p>
                      </div>
                    </div>
                  ))}
                  {market.bets.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      + {market.bets.length - 20} more bets
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Market Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Volume
                </span>
                <span className="font-mono">{formatAmount(market.totalVolume)} ETH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Total Bets
                </span>
                <span className="font-mono">{market.totalBets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Expires
                </span>
                <span className="font-mono text-sm">{formatDate(market.expiresAt)}</span>
              </div>
              {market.resolvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Resolved
                  </span>
                  <span className="font-mono text-sm">{formatDate(market.resolvedAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="text-sm">{formatRelativeTime(market.expiresAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Committee */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Committee ({market.committee.length}/{market.requiredCommittee})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {market.committee.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                  >
                    <span className="font-mono">{truncateAddress(member.address)}</span>
                    <div className="flex items-center gap-2">
                      {member.keyShareSubmitted && (
                        <span className="text-xs text-green-400">Key ✓</span>
                      )}
                      {member.decryptionSubmitted && (
                        <span className="text-xs text-blue-400">Decrypt ✓</span>
                      )}
                    </div>
                  </div>
                ))}
                {market.committee.length < market.requiredCommittee && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {market.requiredCommittee - market.committee.length} more members needed
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
