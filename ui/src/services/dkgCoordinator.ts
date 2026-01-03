/**
 * DKG Coordinator Service
 * Orchestrates the Distributed Key Generation protocol using PeerJS for communication
 */

import {
  generatePolynomial,
  computeShare,
  verifyReceivedShare,
  computeFinalShare,
  computeGroupPublicKey,
  storeEphemeralKey,
  getEphemeralKey,
  type Point,
  type DkgPolynomial,
} from './dkg';
import {
  getPeerService,
  destroyPeerService,
  generatePeerId,
  type CommitmentMessage,
  type ShareMessage,
} from './peerService';
import { getCommitteeMembers } from './contractService';
import type { CommitteeMember } from '@/types';

export type DkgStatus = 
  | 'idle'
  | 'waiting_for_peers'
  | 'connecting'
  | 'round1_commitments'
  | 'round2_shares'
  | 'computing'
  | 'complete'
  | 'error';

export interface DkgState {
  status: DkgStatus;
  marketId: string;
  myIndex: number;
  threshold: number;
  participantCount: number;
  connectedPeers: number;
  receivedCommitments: number;
  receivedShares: number;
  publicKey: Point | null;
  error: string | null;
}

type StateChangeCallback = (state: DkgState) => void;

export class DkgCoordinator {
  private marketId: string;
  private myAddress: string;
  private myIndex: number = 0;
  private threshold: number;
  private participantCount: number;
  
  private polynomial: DkgPolynomial | null = null;
  private receivedCommitments: Map<number, Point[]> = new Map();
  private receivedShares: Map<number, bigint> = new Map();
  private publicKey: Point | null = null;
  
  private status: DkgStatus = 'idle';
  private error: string | null = null;
  private stateChangeCallbacks: StateChangeCallback[] = [];
  
  private committeeMembers: CommitteeMember[] = [];
  private peerIds: Map<string, string> = new Map(); // address -> peerId
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    marketId: string,
    myAddress: string,
    _myCommitment: string,
    threshold: number
  ) {
    this.marketId = marketId;
    this.myAddress = myAddress.toLowerCase();
    this.threshold = threshold;
    this.participantCount = threshold; // For now, n = t
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) this.stateChangeCallbacks.splice(index, 1);
    };
  }

  /**
   * Get current state
   */
  getState(): DkgState {
    return {
      status: this.status,
      marketId: this.marketId,
      myIndex: this.myIndex,
      threshold: this.threshold,
      participantCount: this.participantCount,
      connectedPeers: getPeerService().getConnectedPeerCount(),
      receivedCommitments: this.receivedCommitments.size,
      receivedShares: this.receivedShares.size,
      publicKey: this.publicKey,
      error: this.error,
    };
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    const state = this.getState();
    for (const callback of this.stateChangeCallbacks) {
      callback(state);
    }
  }

  /**
   * Set status and notify
   */
  private setStatus(status: DkgStatus, error?: string): void {
    this.status = status;
    this.error = error || null;
    this.notifyStateChange();
  }

  /**
   * Start the DKG process
   */
  async start(): Promise<void> {
    try {
      this.setStatus('waiting_for_peers');
      
      // Start polling for committee members
      await this.pollCommitteeMembers();
      
      // Set up polling interval
      this.pollInterval = setInterval(() => {
        this.pollCommitteeMembers();
      }, 5000); // Poll every 5 seconds
      
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }

  /**
   * Poll committee members from chain
   */
  private async pollCommitteeMembers(): Promise<void> {
    try {
      const members = await getCommitteeMembers(BigInt(this.marketId));
      this.committeeMembers = members;
      this.participantCount = members.length;
      
      // Find my index (1-based)
      const myMember = members.findIndex(
        m => m.address.toLowerCase() === this.myAddress
      );
      if (myMember >= 0) {
        this.myIndex = myMember + 1;
      }
      
      // Check if we have enough members
      if (members.length >= this.threshold) {
        // Stop polling and start connecting
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
        await this.connectToPeers();
      }
      
      this.notifyStateChange();
    } catch (err) {
      console.error('[DkgCoordinator] Failed to poll committee:', err);
    }
  }

  /**
   * Connect to all peer committee members
   */
  private async connectToPeers(): Promise<void> {
    this.setStatus('connecting');
    
    const peerService = getPeerService();
    
    // Generate peer IDs for all members
    for (const member of this.committeeMembers) {
      // Use commitment as part of peer ID
      const commitment = member.keyShareSubmitted ? '0x00000000' : '0x' + member.address.slice(2, 10);
      const peerId = generatePeerId(this.marketId, member.address, commitment);
      this.peerIds.set(member.address.toLowerCase(), peerId);
    }
    
    // Initialize our peer
    const myPeerId = this.peerIds.get(this.myAddress);
    if (!myPeerId) {
      throw new Error('Could not generate peer ID');
    }
    
    await peerService.initialize(myPeerId, this.myAddress, this.myIndex);
    
    // Set up message handlers
    this.setupMessageHandlers();
    
    // Connect to other peers
    const connectPromises: Promise<void>[] = [];
    for (const member of this.committeeMembers) {
      const addr = member.address.toLowerCase();
      if (addr === this.myAddress) continue;
      
      const peerId = this.peerIds.get(addr);
      if (peerId) {
        connectPromises.push(
          peerService.connectToPeer(peerId)
            .then(() => console.log('[DkgCoordinator] Connected to:', addr))
            .catch(err => console.warn('[DkgCoordinator] Failed to connect to:', addr, err))
        );
      }
    }
    
    // Wait for connections (with timeout)
    await Promise.race([
      Promise.allSettled(connectPromises),
      new Promise(resolve => setTimeout(resolve, 15000)),
    ]);
    
    this.notifyStateChange();
    
    // Start Round 1 after a short delay to allow connections to stabilize
    setTimeout(() => this.startRound1(), 2000);
  }

  /**
   * Set up message handlers for DKG protocol
   */
  private setupMessageHandlers(): void {
    const peerService = getPeerService();
    
    peerService.onMessage('dkg_commitment', (msg) => {
      this.handleCommitment(msg as CommitmentMessage);
    });
    
    peerService.onMessage('dkg_share', (msg) => {
      this.handleShare(msg as ShareMessage);
    });
    
    peerService.onMessage('dkg_ready', () => {
      this.checkCompletion();
    });
  }

  /**
   * Round 1: Generate and broadcast commitments
   */
  private startRound1(): void {
    this.setStatus('round1_commitments');
    
    // Generate polynomial
    this.polynomial = generatePolynomial(this.threshold);
    
    // Store our own commitment
    this.receivedCommitments.set(this.myIndex, this.polynomial.commitments);
    
    // Broadcast commitments (convert bigint to string for PeerJS serialization)
    const peerService = getPeerService();
    peerService.broadcast({
      type: 'dkg_commitment',
      payload: {
        commitments: this.polynomial.commitments.map(c => [c[0].toString(), c[1].toString()]),
      },
    });
    
    this.notifyStateChange();
    this.checkRound1Complete();
  }

  /**
   * Handle received commitment
   */
  private handleCommitment(msg: CommitmentMessage): void {
    const fromIndex = msg.fromIndex;
    const commitments = msg.payload.commitments.map(
      c => [BigInt(c[0]), BigInt(c[1])] as Point
    );
    
    this.receivedCommitments.set(fromIndex, commitments);
    this.notifyStateChange();
    this.checkRound1Complete();
  }

  /**
   * Check if Round 1 is complete
   */
  private checkRound1Complete(): void {
    if (this.receivedCommitments.size >= this.participantCount) {
      this.startRound2();
    }
  }

  /**
   * Round 2: Compute and send shares
   */
  private startRound2(): void {
    this.setStatus('round2_shares');
    
    if (!this.polynomial) {
      this.setStatus('error', 'Polynomial not generated');
      return;
    }
    
    const peerService = getPeerService();
    
    // Compute and send shares to each participant
    for (const member of this.committeeMembers) {
      const addr = member.address.toLowerCase();
      const targetIndex = this.committeeMembers.findIndex(
        m => m.address.toLowerCase() === addr
      ) + 1;
      
      const share = computeShare(this.polynomial, targetIndex);
      
      if (addr === this.myAddress) {
        // Store our own share
        this.receivedShares.set(this.myIndex, share);
      } else {
        // Send to peer
        const peerId = this.peerIds.get(addr);
        if (peerId) {
          peerService.sendTo(peerId, {
            type: 'dkg_share',
            payload: {
              share: share.toString(),
              toIndex: targetIndex,
            },
          });
        }
      }
    }
    
    this.notifyStateChange();
    this.checkRound2Complete();
  }

  /**
   * Handle received share
   */
  private handleShare(msg: ShareMessage): void {
    const fromIndex = msg.fromIndex;
    const share = BigInt(msg.payload.share);
    
    // Verify share against sender's commitments
    const senderCommitments = this.receivedCommitments.get(fromIndex);
    if (!senderCommitments) {
      console.warn('[DkgCoordinator] No commitments from sender:', fromIndex);
      return;
    }
    
    if (!verifyReceivedShare(share, senderCommitments, this.myIndex)) {
      console.error('[DkgCoordinator] Invalid share from:', fromIndex);
      return;
    }
    
    this.receivedShares.set(fromIndex, share);
    this.notifyStateChange();
    this.checkRound2Complete();
  }

  /**
   * Check if Round 2 is complete
   */
  private checkRound2Complete(): void {
    if (this.receivedShares.size >= this.participantCount) {
      this.computeFinalResult();
    }
  }

  /**
   * Compute final share and public key
   */
  private computeFinalResult(): void {
    this.setStatus('computing');
    
    // Compute final share
    const shares = Array.from(this.receivedShares.values());
    const finalShare = computeFinalShare(shares);
    
    // Compute group public key
    const allCommitments = Array.from(this.receivedCommitments.values());
    this.publicKey = computeGroupPublicKey(allCommitments);
    
    // Store ephemeral key in localStorage
    storeEphemeralKey(this.marketId, finalShare);
    
    // Broadcast ready message (convert bigint to string for PeerJS serialization)
    const peerService = getPeerService();
    peerService.broadcast({
      type: 'dkg_ready',
      payload: {
        publicKey: [this.publicKey[0].toString(), this.publicKey[1].toString()],
      },
    });
    
    this.setStatus('complete');
    console.log('[DkgCoordinator] DKG complete! Public key:', this.publicKey);
    console.log('[DkgCoordinator] Final share stored for market:', this.marketId);
  }

  /**
   * Check if all peers are ready
   */
  private checkCompletion(): void {
    // Already complete, just log
    if (this.status === 'complete') {
      console.log('[DkgCoordinator] Peer confirmed completion');
    }
  }

  /**
   * Get the stored ephemeral key for this market
   */
  getEphemeralKey(): bigint | null {
    return getEphemeralKey(this.marketId);
  }

  /**
   * Get the computed public key
   */
  getPublicKey(): Point | null {
    return this.publicKey;
  }

  /**
   * Stop the DKG process and cleanup
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    destroyPeerService();
    this.setStatus('idle');
  }
}

// Active coordinators per market
const activeCoordinators: Map<string, DkgCoordinator> = new Map();

/**
 * Get or create a DKG coordinator for a market
 */
export function getDkgCoordinator(
  marketId: string,
  myAddress: string,
  myCommitment: string,
  threshold: number
): DkgCoordinator {
  const existing = activeCoordinators.get(marketId);
  if (existing) {
    return existing;
  }
  
  const coordinator = new DkgCoordinator(marketId, myAddress, myCommitment, threshold);
  activeCoordinators.set(marketId, coordinator);
  return coordinator;
}

/**
 * Remove a DKG coordinator
 */
export function removeDkgCoordinator(marketId: string): void {
  const coordinator = activeCoordinators.get(marketId);
  if (coordinator) {
    coordinator.stop();
    activeCoordinators.delete(marketId);
  }
}

/**
 * Check if DKG is complete for a market
 */
export function isDkgComplete(marketId: string): boolean {
  return getEphemeralKey(marketId) !== null;
}
