import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import {
  generatePolynomial,
  computeShare,
  computeGroupPublicKey,
  computeFinalShare,
  reconstructSecret,
  verifyReconstruction,
  type Point,
  type DkgPolynomial,
} from '@/services/dkg';
import { getBetProof } from '@/services/provers/betProver';
import { genCircomInputsForBet, decryptFromCircom, babyJub } from '@/services/encryption';

interface StepResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface TestState {
  // DKG state
  dkgPolynomials: DkgPolynomial[];
  dkgShares: bigint[][];
  dkgFinalShares: bigint[];
  dkgPublicKey: Point | null;
  
  // Encryption state
  side: number;
  encodedSidePoint: [bigint, bigint] | null;
  commitment: bigint | null;
  cypherTextX: bigint | null;
  cypherTextY: bigint | null;
  ephemeralKeyX: bigint | null;
  ephemeralKeyY: bigint | null;
  
  // Decryption state
  reconstructedSecret: bigint | null;
  decryptedPoint: { x: bigint; y: bigint } | null;
  decryptedSide: number | null;
}

const THRESHOLD = 2; // t = 2 (minimum parties needed to decrypt)
const NUM_PARTIES = 3; // n = 3 parties

export function AlgoTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [results, setResults] = useState<StepResult[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [testState, setTestState] = useState<TestState>({
    dkgPolynomials: [],
    dkgShares: [],
    dkgFinalShares: [],
    dkgPublicKey: null,
    side: 1, // YES bet
    encodedSidePoint: null,
    commitment: null,
    cypherTextX: null,
    cypherTextY: null,
    ephemeralKeyX: null,
    ephemeralKeyY: null,
    reconstructedSecret: null,
    decryptedPoint: null,
    decryptedSide: null,
  });

  const addResult = (result: StepResult) => {
    setResults(prev => [...prev, result]);
  };

  const resetTest = () => {
    setResults([]);
    setTestState({
      dkgPolynomials: [],
      dkgShares: [],
      dkgFinalShares: [],
      dkgPublicKey: null,
      side: 1,
      encodedSidePoint: null,
      commitment: null,
      cypherTextX: null,
      cypherTextY: null,
      ephemeralKeyX: null,
      ephemeralKeyY: null,
      reconstructedSecret: null,
      decryptedPoint: null,
      decryptedSide: null,
    });
  };

  const runFullTest = async () => {
    setIsRunning(true);
    resetTest();
    
    try {
      // ==================== Step 1: DKG - Generate Polynomials ====================
      setCurrentStep('DKG: Generating polynomials for each party...');
      
      const polynomials: DkgPolynomial[] = [];
      for (let i = 0; i < NUM_PARTIES; i++) {
        const poly = generatePolynomial(THRESHOLD);
        polynomials.push(poly);
      }
      
      addResult({
        success: true,
        message: `Generated ${NUM_PARTIES} polynomials (degree ${THRESHOLD - 1})`,
        data: {
          polynomialSecrets: polynomials.map((p, i) => ({
            party: i + 1,
            secret: p.coefficients[0].toString().slice(0, 20) + '...',
          })),
        },
      });

      // ==================== Step 2: DKG - Compute Shares ====================
      setCurrentStep('DKG: Computing shares between parties...');
      
      // Each party computes shares for all other parties
      // shares[i][j] = party i's share for party j
      const shares: bigint[][] = [];
      for (let i = 0; i < NUM_PARTIES; i++) {
        const partyShares: bigint[] = [];
        for (let j = 1; j <= NUM_PARTIES; j++) {
          const share = computeShare(polynomials[i], j);
          partyShares.push(share);
        }
        shares.push(partyShares);
      }
      
      addResult({
        success: true,
        message: `Computed ${NUM_PARTIES * NUM_PARTIES} shares`,
        data: {
          sharesMatrix: shares.map((row, i) => ({
            from: i + 1,
            shares: row.map((s, j) => `s[${i+1}→${j+1}]: ${s.toString().slice(0, 15)}...`),
          })),
        },
      });

      // ==================== Step 3: DKG - Compute Final Shares ====================
      setCurrentStep('DKG: Computing final shares for each party...');
      
      // Each party sums all shares they received
      const finalShares: bigint[] = [];
      for (let j = 0; j < NUM_PARTIES; j++) {
        const receivedShares: bigint[] = [];
        for (let i = 0; i < NUM_PARTIES; i++) {
          receivedShares.push(shares[i][j]);
        }
        const finalShare = computeFinalShare(receivedShares);
        finalShares.push(finalShare);
      }
      
      addResult({
        success: true,
        message: `Computed ${NUM_PARTIES} final shares`,
        data: {
          finalShares: finalShares.map((s, i) => ({
            party: i + 1,
            share: s.toString().slice(0, 20) + '...',
          })),
        },
      });

      // ==================== Step 4: DKG - Compute Public Key ====================
      setCurrentStep('DKG: Computing group public key...');
      
      const allCommitments = polynomials.map(p => p.commitments);
      const publicKey = computeGroupPublicKey(allCommitments);
      
      addResult({
        success: true,
        message: 'Computed group public key',
        data: {
          publicKey: {
            x: publicKey[0].toString().slice(0, 30) + '...',
            y: publicKey[1].toString().slice(0, 30) + '...',
          },
        },
      });

      // Update state
      setTestState(prev => ({
        ...prev,
        dkgPolynomials: polynomials,
        dkgShares: shares,
        dkgFinalShares: finalShares,
        dkgPublicKey: publicKey,
      }));

      // ==================== Step 5: Generate Bet Inputs ====================
      setCurrentStep('Encryption: Generating bet inputs...');
      
      const side = 1; // YES bet
      const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
      const amount = BigInt(1e18); // 1 ETH in wei
      const bettorAddress = BigInt('0x1234567890123456789012345678901234567890');
      
      const inputs = await genCircomInputsForBet(
        side,
        salt.toString(),
        Number(amount),
        bettorAddress.toString()
      );
      
      const encodedSidePoint: [bigint, bigint] = [
        BigInt(inputs.encoded_side_point_x),
        BigInt(inputs.encoded_side_point_y),
      ];
      
      addResult({
        success: true,
        message: 'Generated bet inputs',
        data: {
          side,
          encodedSidePointX: encodedSidePoint[0].toString().slice(0, 30) + '...',
          encodedSidePointY: encodedSidePoint[1].toString().slice(0, 30) + '...',
          commitment: inputs.comm.toString().slice(0, 30) + '...',
          nonce: inputs.nonce.toString().slice(0, 20) + '...',
        },
      });

      // ==================== Step 6: Generate ZK Proof (Encryption) ====================
      setCurrentStep('Encryption: Generating ZK proof (this may take a while)...');
      
      const pkArray: [bigint, bigint] = [publicKey[0], publicKey[1]];
      
      const proof = await getBetProof(
        pkArray,
        inputs.comm,
        amount,
        bettorAddress,
        salt,
        BigInt(side),
        inputs.nonce,
        encodedSidePoint
      );
      
      // Public signals: [encryptedMessage[0], encryptedMessage[1], ephemeralKey[0], ephemeralKey[1], ...]
      const cypherTextX = BigInt(proof.publicSignals[0]);
      const cypherTextY = BigInt(proof.publicSignals[1]);
      const ephemeralKeyX = BigInt(proof.publicSignals[2]);
      const ephemeralKeyY = BigInt(proof.publicSignals[3]);
      
      addResult({
        success: true,
        message: 'Generated ZK proof and encrypted message',
        data: {
          cypherTextX: cypherTextX.toString().slice(0, 30) + '...',
          cypherTextY: cypherTextY.toString().slice(0, 30) + '...',
          ephemeralKeyX: ephemeralKeyX.toString().slice(0, 30) + '...',
          ephemeralKeyY: ephemeralKeyY.toString().slice(0, 30) + '...',
          publicSignalsCount: proof.publicSignals.length,
        },
      });

      // Update state
      setTestState(prev => ({
        ...prev,
        side,
        encodedSidePoint,
        commitment: inputs.comm,
        cypherTextX,
        cypherTextY,
        ephemeralKeyX,
        ephemeralKeyY,
      }));

      // ==================== Step 7: Reconstruct Secret ====================
      setCurrentStep('Decryption: Reconstructing secret from shares...');
      
      // Use threshold number of shares (first 2 parties)
      const sharesForReconstruction = [
        { index: 1, share: finalShares[0] },
        { index: 2, share: finalShares[1] },
      ];
      
      const reconstructedSecret = reconstructSecret(sharesForReconstruction);
      
      // Verify reconstruction
      const isValid = verifyReconstruction(reconstructedSecret, publicKey);
      
      addResult({
        success: isValid,
        message: isValid 
          ? 'Reconstructed secret verified against public key' 
          : 'WARNING: Reconstructed secret does NOT match public key',
        data: {
          reconstructedSecret: reconstructedSecret.toString().slice(0, 30) + '...',
          usedParties: [1, 2],
          verificationPassed: isValid,
        },
      });

      // ==================== Step 8: Decrypt ====================
      setCurrentStep('Decryption: Decrypting the ciphertext...');
      
      // Create points from coordinates
      const encryptedMessage = babyJub.fromAffine({ x: cypherTextX, y: cypherTextY });
      const ephemeralKey = babyJub.fromAffine({ x: ephemeralKeyX, y: ephemeralKeyY });
      
      // Decrypt using the reconstructed secret
      const decryptedPoint = decryptFromCircom(encryptedMessage, ephemeralKey, reconstructedSecret);
      
      // Determine the side from the decrypted point
      const decryptedSide = Number(decryptedPoint.x % 2n);
      
      addResult({
        success: true,
        message: 'Decrypted the ciphertext',
        data: {
          decryptedPointX: decryptedPoint.x.toString().slice(0, 30) + '...',
          decryptedPointY: decryptedPoint.y.toString().slice(0, 30) + '...',
          decryptedSide,
        },
      });

      // Update state
      setTestState(prev => ({
        ...prev,
        reconstructedSecret,
        decryptedPoint,
        decryptedSide,
      }));

      // ==================== Step 9: Verify ====================
      setCurrentStep('Verification: Comparing original and decrypted values...');
      
      // Compare original encoded side point with decrypted point
      const originalPointX = encodedSidePoint[0];
      const originalPointY = encodedSidePoint[1];
      const decryptedPointX = decryptedPoint.x;
      const decryptedPointY = decryptedPoint.y;
      
      const pointsMatch = originalPointX === decryptedPointX && originalPointY === decryptedPointY;
      const sidesMatch = side === decryptedSide;
      
      addResult({
        success: pointsMatch && sidesMatch,
        message: pointsMatch && sidesMatch
          ? '✅ SUCCESS: Decryption verified! Original and decrypted values match.'
          : '❌ FAILURE: Decryption mismatch!',
        data: {
          originalSide: side,
          decryptedSide,
          sidesMatch,
          originalPointX: originalPointX.toString().slice(0, 30) + '...',
          decryptedPointX: decryptedPointX.toString().slice(0, 30) + '...',
          pointsMatch,
        },
      });

      if (pointsMatch && sidesMatch) {
        toast.success('Full encryption/decryption test passed!');
      } else {
        toast.error('Encryption/decryption test failed - mismatch detected');
      }

    } catch (error) {
      console.error('Test failed:', error);
      addResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: String(error) },
      });
      toast.error('Test failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Test Page</CardTitle>
          <CardDescription>
            Simulate the full encryption/decryption flow without on-chain operations.
            This tests DKG (3 parties, threshold 2), encryption via ZK proof, and decryption.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runFullTest} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Full Test'}
            </Button>
            <Button variant="outline" onClick={resetTest} disabled={isRunning}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          {currentStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStep}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      Step {index + 1}: {result.message}
                    </p>
                    {result.data && (
                      <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Number of parties (n):</span>
              <span className="ml-2 font-mono">{NUM_PARTIES}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Threshold (t):</span>
              <span className="ml-2 font-mono">{THRESHOLD}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Test side:</span>
              <span className="ml-2 font-mono">YES (1)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Circuit:</span>
              <span className="ml-2 font-mono">Bet.circom</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
