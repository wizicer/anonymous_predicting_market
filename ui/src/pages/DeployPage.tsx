import { useState, useEffect, useCallback } from 'react';
import { ContractFactory, BrowserProvider } from 'ethers';
import { useWallet } from '@/contexts/useWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, Loader2, ExternalLink, AlertCircle, Copy, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import deploymentArtifacts from '@/contracts/artifacts.json';

const DEPLOYMENT_STORAGE_KEY = 'apm_deployment';
const EXPLORER_BASE_URL = 'https://sepolia.mantlescan.xyz';

interface DeploymentState {
  betVerifier: string | null;
  betVerifierTxHash: string | null;
  batchOpenVerifier: string | null;
  batchOpenVerifierTxHash: string | null;
  predictionMarket: string | null;
  predictionMarketTxHash: string | null;
  chainId: number | null;
  deployedAt: string | null;
  deployer: string | null;
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  txHash?: string;
  address?: string;
  error?: string;
}

function getStoredDeployment(): DeploymentState | null {
  try {
    const stored = localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveDeployment(deployment: DeploymentState) {
  localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(deployment));
}

export function DeployPage() {
  const { address, isConnected, connect } = useWallet();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentState>(() => 
    getStoredDeployment() || {
      betVerifier: null,
      betVerifierTxHash: null,
      batchOpenVerifier: null,
      batchOpenVerifierTxHash: null,
      predictionMarket: null,
      predictionMarketTxHash: null,
      chainId: null,
      deployedAt: null,
      deployer: null,
    }
  );

  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Connect your wallet to deploy contracts',
      status: 'pending',
    },
    {
      id: 2,
      title: 'Deploy MockBetVerifier',
      description: 'Deploy the bet verification contract',
      status: 'pending',
    },
    {
      id: 3,
      title: 'Deploy MockBatchOpenVerifier',
      description: 'Deploy the batch open verification contract',
      status: 'pending',
    },
    {
      id: 4,
      title: 'Deploy AnonymousPredictionMarket',
      description: 'Deploy the main prediction market contract',
      status: 'pending',
    },
  ]);

  // Update step 1 based on wallet connection
  useEffect(() => {
    setSteps(prev => prev.map(step => 
      step.id === 1 
        ? { ...step, status: isConnected ? 'completed' : 'pending' }
        : step
    ));
  }, [isConnected]);

  // Restore steps from stored deployment
  useEffect(() => {
    const stored = getStoredDeployment();
    if (stored) {
      setSteps(prev => prev.map(step => {
        if (step.id === 2 && stored.betVerifier) {
          return { ...step, status: 'completed', address: stored.betVerifier, txHash: stored.betVerifierTxHash || undefined };
        }
        if (step.id === 3 && stored.batchOpenVerifier) {
          return { ...step, status: 'completed', address: stored.batchOpenVerifier, txHash: stored.batchOpenVerifierTxHash || undefined };
        }
        if (step.id === 4 && stored.predictionMarket) {
          return { ...step, status: 'completed', address: stored.predictionMarket, txHash: stored.predictionMarketTxHash || undefined };
        }
        return step;
      }));
    }
  }, []);

  const updateStep = useCallback((stepId: number, updates: Partial<Step>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const deployContracts = async () => {
    if (!isConnected || !window.ethereum) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDeploying(true);
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    const newDeployment: DeploymentState = {
      ...deployment,
      chainId,
      deployer: address,
      deployedAt: new Date().toISOString(),
    };

    try {
      // Step 2: Deploy MockBetVerifier
      if (!deployment.betVerifier) {
        updateStep(2, { status: 'in_progress' });
        toast.info('Deploying MockBetVerifier...');

        const betVerifierFactory = new ContractFactory(
          deploymentArtifacts.MockBetVerifier.abi,
          deploymentArtifacts.MockBetVerifier.bytecode,
          signer
        );
        const betVerifier = await betVerifierFactory.deploy();
        const betVerifierTx = betVerifier.deploymentTransaction();
        
        newDeployment.betVerifierTxHash = betVerifierTx?.hash || null;
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(2, { status: 'in_progress', txHash: betVerifierTx?.hash });
        
        await betVerifier.waitForDeployment();
        const betVerifierAddress = await betVerifier.getAddress();
        
        newDeployment.betVerifier = betVerifierAddress;
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(2, { status: 'completed', address: betVerifierAddress, txHash: betVerifierTx?.hash });
        toast.success(`MockBetVerifier deployed: ${betVerifierAddress.slice(0, 10)}...`);
      }

      // Step 3: Deploy MockBatchOpenVerifier
      if (!deployment.batchOpenVerifier) {
        updateStep(3, { status: 'in_progress' });
        toast.info('Deploying MockBatchOpenVerifier...');

        const batchOpenVerifierFactory = new ContractFactory(
          deploymentArtifacts.MockBatchOpenVerifier.abi,
          deploymentArtifacts.MockBatchOpenVerifier.bytecode,
          signer
        );
        const batchOpenVerifier = await batchOpenVerifierFactory.deploy();
        const batchOpenVerifierTx = batchOpenVerifier.deploymentTransaction();
        
        newDeployment.batchOpenVerifierTxHash = batchOpenVerifierTx?.hash || null;
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(3, { status: 'in_progress', txHash: batchOpenVerifierTx?.hash });
        
        await batchOpenVerifier.waitForDeployment();
        const batchOpenVerifierAddress = await batchOpenVerifier.getAddress();
        
        newDeployment.batchOpenVerifier = batchOpenVerifierAddress;
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(3, { status: 'completed', address: batchOpenVerifierAddress, txHash: batchOpenVerifierTx?.hash });
        toast.success(`MockBatchOpenVerifier deployed: ${batchOpenVerifierAddress.slice(0, 10)}...`);
      }

      // Step 4: Deploy AnonymousPredictionMarket
      if (!deployment.predictionMarket) {
        updateStep(4, { status: 'in_progress' });
        toast.info('Deploying AnonymousPredictionMarket...');

        const betVerifierAddr = newDeployment.betVerifier || deployment.betVerifier;
        const batchOpenVerifierAddr = newDeployment.batchOpenVerifier || deployment.batchOpenVerifier;

        if (!betVerifierAddr || !batchOpenVerifierAddr) {
          throw new Error('Verifier contracts not deployed');
        }

        const marketFactory = new ContractFactory(
          deploymentArtifacts.AnonymousPredictionMarket.abi,
          deploymentArtifacts.AnonymousPredictionMarket.bytecode,
          signer
        );
        const market = await marketFactory.deploy(betVerifierAddr, batchOpenVerifierAddr);
        const marketTx = market.deploymentTransaction();
        
        newDeployment.predictionMarketTxHash = marketTx?.hash || null;
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(4, { status: 'in_progress', txHash: marketTx?.hash });
        
        await market.waitForDeployment();
        const marketAddress = await market.getAddress();
        
        newDeployment.predictionMarket = marketAddress;
        newDeployment.deployedAt = new Date().toISOString();
        setDeployment({ ...newDeployment });
        saveDeployment({ ...newDeployment });
        
        updateStep(4, { status: 'completed', address: marketAddress, txHash: marketTx?.hash });
        toast.success('All contracts deployed successfully!');
      }

    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Deployment failed: ${errorMessage}`);
      
      // Mark current step as error
      const currentStep = steps.find(s => s.status === 'in_progress');
      if (currentStep) {
        updateStep(currentStep.id, { status: 'error', error: errorMessage });
      }
    } finally {
      setIsDeploying(false);
    }
  };

  const resetDeployment = () => {
    if (confirm('Are you sure you want to reset the deployment? This will clear all stored addresses.')) {
      localStorage.removeItem(DEPLOYMENT_STORAGE_KEY);
      setDeployment({
        betVerifier: null,
        betVerifierTxHash: null,
        batchOpenVerifier: null,
        batchOpenVerifierTxHash: null,
        predictionMarket: null,
        predictionMarketTxHash: null,
        chainId: null,
        deployedAt: null,
        deployer: null,
      });
      setSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 1 && isConnected ? 'completed' : 'pending',
        address: undefined,
        txHash: undefined,
        error: undefined,
      })));
      toast.success('Deployment reset');
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const allDeployed = deployment.betVerifier && deployment.batchOpenVerifier && deployment.predictionMarket;
  const canContinue = isConnected && !allDeployed;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Contract Deployment</h1>
        <p className="text-muted-foreground">
          Deploy the Anonymous Prediction Market contracts to the blockchain
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">Important</p>
              <p className="text-muted-foreground">
                This page deploys mock verifier contracts for development/testing. 
                For production, deploy the real ZK verifier contracts generated from circuits.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Steps</CardTitle>
          <CardDescription>
            Follow the steps below to deploy all required contracts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex gap-4 p-4 rounded-lg border transition-colors ${
                step.status === 'in_progress' ? 'border-blue-500/50 bg-blue-500/5' :
                step.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                step.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                'border-border'
              }`}
            >
              <div className="shrink-0">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {step.address && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {step.address}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(step.address!)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a
                      href={`${EXPLORER_BASE_URL}/address/${step.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                
                {step.txHash && (
                  <div className="mt-1">
                    <a
                      href={`${EXPLORER_BASE_URL}/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {step.error && (
                  <p className="mt-2 text-sm text-red-500">{step.error}</p>
                )}

                {step.id === 1 && !isConnected && (
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={connect}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        {canContinue && (
          <Button 
            size="lg"
            onClick={deployContracts}
            disabled={isDeploying || !isConnected}
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : deployment.betVerifier || deployment.batchOpenVerifier ? (
              'Continue Deployment'
            ) : (
              'Start Deployment'
            )}
          </Button>
        )}
        
        {(deployment.betVerifier || deployment.batchOpenVerifier || deployment.predictionMarket) && (
          <Button 
            variant="outline"
            size="lg"
            onClick={resetDeployment}
            disabled={isDeploying}
          >
            Reset Deployment
          </Button>
        )}
      </div>

      {/* Deployment Summary */}
      {allDeployed && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              Deployment Complete
            </CardTitle>
            <CardDescription>
              All contracts have been successfully deployed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chain ID:</span>
                <span className="font-mono">{deployment.chainId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deployed At:</span>
                <span>{deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deployer:</span>
                <span className="font-mono text-xs">{deployment.deployer?.slice(0, 10)}...{deployment.deployer?.slice(-8)}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t space-y-2">
              <h4 className="font-medium text-sm">Contract Addresses</h4>
              {[
                { label: 'BetVerifier', address: deployment.betVerifier },
                { label: 'BatchOpenVerifier', address: deployment.batchOpenVerifier },
                { label: 'PredictionMarket', address: deployment.predictionMarket },
              ].map(({ label, address }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{label}:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                      {address?.slice(0, 10)}...{address?.slice(-8)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(address!)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a
                      href={`${EXPLORER_BASE_URL}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">deployment.json</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const deploymentJson = JSON.stringify({
                        betVerifier: deployment.betVerifier,
                        batchOpenVerifier: deployment.batchOpenVerifier,
                        predictionMarket: deployment.predictionMarket,
                        chainId: deployment.chainId,
                        deployedAt: deployment.deployedAt
                      }, null, 2);
                      copyToClipboard(deploymentJson);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy deployment.json
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{JSON.stringify({
  betVerifier: deployment.betVerifier,
  batchOpenVerifier: deployment.batchOpenVerifier,
  predictionMarket: deployment.predictionMarket,
  chainId: deployment.chainId,
  deployedAt: deployment.deployedAt
}, null, 2)}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Copy this content to update <code className="bg-muted px-1 rounded">ui/src/contracts/deployment.json</code>
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Deployment data is stored in your browser's local storage and will persist across sessions.
                Use the "Reset Deployment" button to start a new deployment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
