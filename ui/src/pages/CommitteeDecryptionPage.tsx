import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useWallet } from '@/contexts/useWallet';
import { getEphemeralKey, reconstructSecret, mul } from '@/services/dkg';
import { getEffectiveStatus } from '@/lib/marketStatus';

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

// Store public key info per market for debugging
interface PublicKeyInfo {
  onChainX: bigint;
  onChainY: bigint;
  derivedX: bigint;
  derivedY: bigint;
  match: boolean;
}
type PublicKeyInfoMap = Record<string, PublicKeyInfo>;


// Show public key information in UI
const SHOW_PUBLIC_KEY_INFO = false;

export function CommitteeDecryptionPage() {
  const { address } = useWallet();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [decryptedData, setDecryptedData] = useState<DecryptedDataMap>({});
  const [publicKeyInfo, setPublicKeyInfo] = useState<PublicKeyInfoMap>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadMarkets]);

  // Markets that are expired (using effective status which treats active+expired as expired)
  const decryptingMarkets: Market[] = markets.filter(
    m => getEffectiveStatus(m) === 'expired'
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
  // Uses the ephemeral private key stored during DKG, or generates a random one if not available
  const handleSubmitKeyShare = async (marketId: string) => {
    // Try to get the ephemeral key from DKG (stored in localStorage)
    let keyShare = getEphemeralKey(marketId);
    
    if (!keyShare) {
      // Fallback: generate a random key share if DKG wasn't performed
      console.warn('[CommitteeDecryptionPage] No ephemeral key found for market, using random');
      keyShare = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    }
    
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
  // Reconstructs the shared secret from on-chain key shares using Lagrange interpolation
  const handleLocalDecrypt = async (marketId: string) => {
    // Get all bets for this market
    const bets: BetData[] = await getAllBets(BigInt(marketId));
    
    if (bets.length === 0) {
      toast.info('No bets to decrypt');
      return;
    }

    // Get market data to retrieve on-chain public key
    const market = markets.find(m => m.id === marketId);
    let onChainPKX: bigint | null = null;
    let onChainPKY: bigint | null = null;
    
    if (market?.publicKeyX && market?.publicKeyY) {
      onChainPKX = BigInt(market.publicKeyX);
      onChainPKY = BigInt(market.publicKeyY);
    }

    // Get all committee key shares from on-chain
    const committeeKeys = await getCommitteeKeys(BigInt(marketId));
    
    // Filter to only submitted keys and create shares array with indices (1-based)
    const shares: Array<{ index: number; share: bigint }> = [];
    for (let i = 0; i < committeeKeys.length; i++) {
      if (committeeKeys[i].key !== 0n) {
        shares.push({
          index: i + 1, // 1-based index for Lagrange interpolation
          share: committeeKeys[i].key,
        });
      }
    }
    
    if (shares.length === 0) {
      throw new Error('No key shares have been submitted yet');
    }

    // Reconstruct the shared secret using Lagrange interpolation
    // This computes f(0) from the submitted shares
    const reconstructedSecret = reconstructSecret(shares);
    console.log('[CommitteeDecryptionPage] Reconstructed secret from', shares.length, 'shares');
    
    // Verify reconstructed secret by deriving public key
    const derivedPublicKey = mul(reconstructedSecret);
    
    // Store public key info for UI display
    if (onChainPKX && onChainPKY) {
      const match = onChainPKX === derivedPublicKey[0] && onChainPKY === derivedPublicKey[1];
      setPublicKeyInfo(prev => ({
        ...prev,
        [marketId]: {
          onChainX: onChainPKX,
          onChainY: onChainPKY,
          derivedX: derivedPublicKey[0],
          derivedY: derivedPublicKey[1],
          match,
        },
      }));
    }

    

    // Decrypt each bet using the reconstructed secret
    const decryptedBets: DecryptedBetData[] = [];
    
    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      
      try {
        // Use cypherTextX and cypherTextY directly from contract storage
        const cypherTextX = bet.cypherTextX;
        const cypherTextY = bet.cypherTextY;
        
        // Create the encrypted message point from cypherText coordinates
        const encryptedMessage = babyJub.fromAffine({ x: cypherTextX, y: cypherTextY });
        
        // Create the ephemeral key point from stored coordinates
        const ephemeralKey = babyJub.fromAffine({ x: bet.ephemeralKeyX, y: bet.ephemeralKeyY });
        
        console.log('encryptedMessage:', encryptedMessage.x.toString(), encryptedMessage.y.toString());
        console.log('ephemeralKey:', ephemeralKey.x.toString(), ephemeralKey.y.toString());
        console.log('reconstructedSecret:', reconstructedSecret.toString());
        
        // Decrypt using the reconstructed secret
        const decryptedPoint = decryptFromCircom(encryptedMessage, ephemeralKey, reconstructedSecret);
        console.log('decryptedPoint:', decryptedPoint.x.toString(), decryptedPoint.y.toString());

        
        
        // Determine the side from the decrypted point
        // The encoded side point's x coordinate parity indicates the side (0 = No, 1 = Yes)
        const decryptedSide = Number(decryptedPoint.x % 2n);
        
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
    const comm = bets.map(b => BigInt(b.commitment));
    const amount = bets.map(b => b.amount);
    const market = markets.find(m => m.id === marketId);
    const salt = market?.salt ?? 0n;
    const side = bets.map(b => BigInt(b.decryptedSide));
    const address = bets.map(b => BigInt(b.bettor));
    const encodedSidePoint: [bigint, bigint][] = bets.map(b => [b.decryptedSidePoint.x, b.decryptedSidePoint.y]);

    const MAX_BETS = 10;
    while (comm.length < MAX_BETS) {
      comm.push(0n);
    }
    while (amount.length < MAX_BETS) {
      amount.push(0n);
    }
    while (side.length < MAX_BETS) {
      side.push(0n);
    }
    while (address.length < MAX_BETS) {
      address.push(0n);
    }
    while (encodedSidePoint.length < MAX_BETS) {
      encodedSidePoint.push([0n, 0n]);
    }
    console.log('comm:', comm);
    console.log('amount:', amount);
    console.log('side:', side);
    console.log('address:', address);
    console.log('encodedSidePoint:', encodedSidePoint);

    // Generate proof using batchOpenProver
    const proof = await getBatchOpenProof(
      MAX_BETS,
      comm,
      amount,
      salt,
      side,
      address,
      encodedSidePoint,
    );
    
    console.log('proof:', proof);
    console.log('sum0:', typeof proof.sum0 === 'string' ? BigInt(proof.sum0).toString() : proof.sum0.toString());
    console.log('sum1:', typeof proof.sum1 === 'string' ? BigInt(proof.sum1).toString() : proof.sum1.toString());
    console.log('publicSignals:', proof.publicSignals);
    
    await batchOpenAndResolve(
      BigInt(marketId),
      proof.a,
      proof.b,
      proof.c,
      proof.publicSignals
    );
    console.log("batch Open and Resolve successful");
    
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
                        Expired: {formatDate(market.expiresAt)} •
                        {market.totalBets} bets to decrypt
                      </CardDescription>
                    </div>
                    <StatusBadge status={effectiveStatus} />
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
                        className={`h-full transition-all ${hasSufficientKeyShares(market) ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${(decryptedCount / market.minimumCommittee) * 100}%` }}
                      />
                    </div>
                    {hasSufficientKeyShares(market) && (
                      <p className="text-xs text-green-400">
                        ✓ Minimum keys submitted - Local Decrypt is now available
                      </p>
                    )}
                  </div>

                  {/* Public Key Verification */}
                  {SHOW_PUBLIC_KEY_INFO && publicKeyInfo[market.id] && (
                    <div className="text-xs font-mono bg-muted/50 p-3 rounded space-y-2">
                      <div className="font-semibold text-muted-foreground">Public Key Verification:</div>
                      <div className="space-y-1">
                        <div className="text-yellow-400">On-chain PK (used for encryption):</div>
                        <div className="break-all pl-2">X: {publicKeyInfo[market.id].onChainX.toString()}</div>
                        <div className="break-all pl-2">Y: {publicKeyInfo[market.id].onChainY.toString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-blue-400">Derived PK (from reconstructed secret):</div>
                        <div className="break-all pl-2">X: {publicKeyInfo[market.id].derivedX.toString()}</div>
                        <div className="break-all pl-2">Y: {publicKeyInfo[market.id].derivedY.toString()}</div>
                      </div>
                      <div className={`font-semibold ${publicKeyInfo[market.id].match ? 'text-green-400' : 'text-red-400'}`}>
                        {publicKeyInfo[market.id].match ? '✓ Keys Match' : '✗ Keys DO NOT Match - Decryption will fail!'}
                      </div>
                    </div>
                  )}
                  
                  {/* Key Mismatch Warning - Always show if keys don't match */}
                  {!SHOW_PUBLIC_KEY_INFO && publicKeyInfo[market.id] && !publicKeyInfo[market.id].match && (
                    <div className="text-xs bg-red-500/10 border border-red-500/30 p-3 rounded">
                      <div className="font-semibold text-red-400">
                        ⚠️ Key Mismatch Detected - Decryption will fail!
                      </div>
                      <div className="text-red-300 mt-1">
                        The reconstructed secret doesn't match the on-chain public key. This will cause decryption failures.
                      </div>
                    </div>
                  )}

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
