import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import type { Market } from '@/types';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, Download, Loader2, Lock, Shield, Upload } from 'lucide-react';
import { getAllMarkets, submitKeyShare, batchOpenAndResolve, getAllBets, getCommitteeKeys, type BetData } from '@/services/contractService';
import { getBatchOpenProof } from '@/services/provers/batchOpenProver';
import { decryptFromCircom, babyJub } from '@/services/encryption';
import { useWallet } from '@/contexts/WalletContext';

type LoadingStates = Record<string, boolean>;

type DecryptStep = 'download' | 'decrypt' | 'upload';

// Decrypted bet data structure
interface DecryptedBetData {
  betId: number;
  bettor: string;
  commitment: string;
  amount: bigint;
  decryptedSide: number; // 0 = No, 1 = Yes
  decryptedSidePoint: { x: bigint; y: bigint };
}

// Store decrypted data per market
type DecryptedDataMap = Record<string, DecryptedBetData[]>;

// Mock function to combine key shares into a single private key
// In production, this would use proper threshold cryptography (e.g., Shamir's Secret Sharing)
function combineKeyShares(keys: bigint[]): bigint {
  if (keys.length === 0) {
    throw new Error('No key shares provided');
  }
  // Simple mock: XOR all keys together (NOT cryptographically secure - just for demo)
  // In production, use proper threshold decryption scheme
  let combined = keys[0];
  for (let i = 1; i < keys.length; i++) {
    combined = combined ^ keys[i];
  }
  return combined;
}

export function CommitteeDecryptionPage() {
  const { address } = useWallet();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [decryptedData, setDecryptedData] = useState<DecryptedDataMap>({});

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

  // Markets that are expired OR active but past expiration time
  const decryptingMarkets: Market[] = markets.filter(
    m => m.status === 'expired' || (m.status === 'active' && new Date(m.expiresAt) <= new Date())
  );

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Check if sufficient key shares have been submitted for a market
  const hasSufficientKeyShares = (market: Market): boolean => {
    const submittedCount = market.committee.filter(m => m.decryptionSubmitted).length;
    return submittedCount >= market.minimumCommittee;
  };

  // Check if decryption has been done for a market
  const hasDecryptedData = (marketId: string): boolean => {
    return !!decryptedData[marketId] && decryptedData[marketId].length > 0;
  };

  // Step 1: Submit key share (prove and disclose)
  const handleSubmitKeyShare = async (marketId: string) => {
    const keyShare = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    await submitKeyShare(BigInt(marketId), keyShare);
    toast.success('Key share submitted!');
    await loadMarkets();
  };

  // Check if current user has already submitted their key share for a market
  const hasUserSubmittedKeyShare = (market: Market): boolean => {
    if (!address) return false;
    const userMember = market.committee.find(m => m.address.toLowerCase() === address.toLowerCase());
    return userMember?.decryptionSubmitted ?? false;
  };

  // Step 2: Download bets and decrypt them locally
  const handleLocalDecrypt = async (marketId: string) => {
    // Get all bets for this market
    const bets: BetData[] = await getAllBets(BigInt(marketId));
    
    if (bets.length === 0) {
      toast.info('No bets to decrypt');
      return;
    }

    // Get all committee key shares
    const committeeKeys = await getCommitteeKeys(BigInt(marketId));
    const submittedKeys = committeeKeys.filter(k => k.key !== 0n).map(k => k.key);
    
    if (submittedKeys.length === 0) {
      throw new Error('No key shares have been submitted yet');
    }

    // Combine key shares to get the private key
    const combinedPrivateKey = combineKeyShares(submittedKeys);

    // Decrypt each bet
    const decryptedBets: DecryptedBetData[] = [];
    
    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      
      try {
        // Parse cypherText as two coordinates (ephemeral key and encrypted message)
        // The cypherText is stored as bytes32, we need to parse it appropriately
        // For now, we'll use mock decryption since the actual format depends on implementation
        const cypherTextBigInt = BigInt(bet.cypherText);
        
        // Mock: Create points from the cypherText (in production, parse actual encrypted data)
        // The encrypted message would be stored differently in a real implementation
        const mockEphemeralKey = babyJub.BASE.multiply(cypherTextBigInt % 1000n);
        const mockEncryptedMessage = babyJub.BASE.multiply((cypherTextBigInt >> 10n) % 1000n);
        
        // Decrypt using the combined private key
        const decryptedPoint = decryptFromCircom(mockEncryptedMessage, mockEphemeralKey, combinedPrivateKey);
        
        // Determine the side from the decrypted point
        // In production, this would match against known encoded side points
        const decryptedSide = Number(decryptedPoint.x % 2n); // Mock: use x coordinate parity
        
        decryptedBets.push({
          betId: i,
          bettor: bet.bettor,
          commitment: bet.commitment,
          amount: bet.amount,
          decryptedSide,
          decryptedSidePoint: { x: decryptedPoint.x, y: decryptedPoint.y },
        });
      } catch (err) {
        console.error(`Failed to decrypt bet ${i}:`, err);
        // Continue with other bets
      }
    }

    // Store decrypted data
    setDecryptedData(prev => ({
      ...prev,
      [marketId]: decryptedBets,
    }));

    toast.success(`Decrypted ${decryptedBets.length} bets locally`);
  };

  // Step 3: Generate batch proof and resolve market
  const handleBatchProveAndResolve = async (marketId: string) => {
    const bets = decryptedData[marketId];
    
    if (!bets || bets.length === 0) {
      throw new Error('No decrypted data available. Run decrypt step first.');
    }

    // Prepare inputs for batch open proof
    const N = BigInt(bets.length);
    const comm = bets.map(b => BigInt(b.commitment));
    const amount = bets.map(b => b.amount);
    const salt = 0n; // Would come from market data
    const side = bets.map(b => BigInt(b.decryptedSide));
    const address = bets.map(b => BigInt(b.bettor));
    const encodedSidePoint: [bigint, bigint][] = bets.map(b => [b.decryptedSidePoint.x, b.decryptedSidePoint.y]);

    // Generate proof using batchOpenProver
    const proof = await getBatchOpenProof(
      N,
      comm,
      amount,
      salt,
      side,
      address,
      encodedSidePoint,
    );
    
    // Pad publicSignals to 23 elements (3 + MAX_BETS * 2 where MAX_BETS = 10)
    const publicSignals: bigint[] = [proof.sum0, proof.sum1, 0n];
    while (publicSignals.length < 23) {
      publicSignals.push(0n);
    }
    
    await batchOpenAndResolve(
      BigInt(marketId),
      proof.a,
      proof.b,
      proof.c,
      publicSignals
    );
    
    // Clear decrypted data after successful resolution
    setDecryptedData(prev => {
      const newData = { ...prev };
      delete newData[marketId];
      return newData;
    });
    
    toast.success('Market resolved!');
    await loadMarkets();
  };

  // Main handler that dispatches to individual step functions
  const handleDecrypt = async (marketId: string, step: DecryptStep) => {
    const key = `${step}-${marketId}`;
    setLoading(key, true);
    
    try {
      if (step === 'download') {
        await handleSubmitKeyShare(marketId);
      } else if (step === 'decrypt') {
        await handleLocalDecrypt(marketId);
      } else if (step === 'upload') {
        await handleBatchProveAndResolve(marketId);
      }
    } catch (error) {
      console.error(`Failed to ${step}:`, error);
      toast.error(`Failed to ${step}`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(key, false);
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
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400 mb-1">Decryption Workflow</p>
              <p className="text-muted-foreground">
                After market expiration, committee members must submit their ephemeral
                private keys to enable bet decryption. ZK proofs verify correct decryption.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markets List */}
      {decryptingMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No markets awaiting decryption
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decryptingMarkets.map(market => {
            const decryptedCount = market.committee.filter(m => m.decryptionSubmitted).length;

            return (
              <Card key={market.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Link to={`/market/${market.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{market.question}</CardTitle>
                      </Link>
                      <CardDescription>
                        Expired: {formatDate(market.expiresAt)} •
                        {market.totalBets} bets to decrypt
                      </CardDescription>
                    </div>
                    <StatusBadge status={market.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Decryption Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Decryption Progress</span>
                      <span>{decryptedCount} / {market.minimumCommittee} keys submitted (committee: {market.committee.length})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${(decryptedCount / market.committee.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Three-step workflow */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'download')}
                      disabled={loadingStates[`download-${market.id}`] || hasUserSubmittedKeyShare(market)}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`download-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">1. Prove and Disclose</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'decrypt')}
                      disabled={loadingStates[`decrypt-${market.id}`] || !hasSufficientKeyShares(market) || hasDecryptedData(market.id)}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`decrypt-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">2. Local Decrypt</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecrypt(market.id, 'upload')}
                      disabled={loadingStates[`upload-${market.id}`] || !hasDecryptedData(market.id)}
                      className="flex-col h-auto py-3"
                    >
                      {loadingStates[`upload-${market.id}`] ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                      <span className="text-xs mt-1">3. Batch Prove</span>
                    </Button>
                  </div>

                  {/* Committee Status */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {market.committee.map((member, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={`font-mono text-xs ${
                          member.decryptionSubmitted
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : ''
                        }`}
                      >
                        {truncateAddress(member.address)}
                        {member.decryptionSubmitted && (
                          <CheckCircle className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
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
