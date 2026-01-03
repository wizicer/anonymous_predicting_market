/**
 * PeerJS Service for Committee Communication
 * Handles peer-to-peer communication between committee members during DKG
 */

import Peer from 'peerjs';

// Type definitions for PeerJS
interface DataConnection {
  peer: string;
  open: boolean;
  send(data: unknown): void;
  close(): void;
  on(event: 'open' | 'data' | 'close' | 'error', callback: (data?: unknown) => void): void;
}

export type MessageType = 
  | 'dkg_commitment'
  | 'dkg_share'
  | 'dkg_ready'
  | 'dkg_complete';

export interface PeerMessage {
  type: MessageType;
  fromAddress: string;
  fromIndex: number;
  payload: unknown;
}

// Note: PeerJS doesn't support bigint serialization, so we use strings for transmission
export interface CommitmentMessage extends PeerMessage {
  type: 'dkg_commitment';
  payload: {
    commitments: [string, string][]; // bigint as string for serialization
  };
}

export interface ShareMessage extends PeerMessage {
  type: 'dkg_share';
  payload: {
    share: string; // bigint as string for serialization
    toIndex: number;
  };
}

export interface ReadyMessage extends PeerMessage {
  type: 'dkg_ready';
  payload: {
    publicKey: [string, string]; // bigint as string for serialization
  };
}

type MessageHandler = (message: PeerMessage, conn: DataConnection) => void;

/**
 * Generate a PeerJS ID from address and commitment
 * Format: market_{marketId}_{truncatedAddress}_{truncatedCommitment}
 */
export function generatePeerId(marketId: string, address: string, commitment: string): string {
  const addrPart = address.slice(2, 10).toLowerCase();
  const commitPart = commitment.slice(2, 10).toLowerCase();
  return `apm_${marketId}_${addrPart}_${commitPart}`;
}

/**
 * Parse peer ID to extract components
 */
export function parsePeerId(peerId: string): { marketId: string; addrPart: string; commitPart: string } | null {
  const match = peerId.match(/^apm_(\d+)_([a-f0-9]+)_([a-f0-9]+)$/);
  if (!match) return null;
  return {
    marketId: match[1],
    addrPart: match[2],
    commitPart: match[3],
  };
}

export class PeerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();
  private myPeerId: string = '';
  private myAddress: string = '';
  private myIndex: number = 0;

  /**
   * Initialize peer with given ID
   */
  async initialize(peerId: string, address: string, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.myPeerId = peerId;
      this.myAddress = address;
      this.myIndex = index;

      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', (id: string) => {
        console.log('[PeerService] Connected with ID:', id);
        resolve();
      });

      this.peer.on('error', (err: { type: string }) => {
        console.error('[PeerService] Error:', err);
        if (err.type === 'unavailable-id') {
          // ID already taken, might be reconnecting
          resolve();
        } else {
          reject(err);
        }
      });

      this.peer.on('connection', (conn: DataConnection) => {
        this.handleIncomingConnection(conn);
      });
    });
  }

  /**
   * Handle incoming peer connection
   */
  private handleIncomingConnection(conn: DataConnection): void {
    console.log('[PeerService] Incoming connection from:', conn.peer);
    
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      console.log('[PeerService] Connection opened with:', conn.peer);
    });

    conn.on('data', (data: unknown) => {
      this.handleMessage(data as PeerMessage, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      console.log('[PeerService] Connection closed with:', conn.peer);
    });

    conn.on('error', (err: unknown) => {
      console.error('[PeerService] Connection error with', conn.peer, ':', err);
    });
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(peerId: string): Promise<DataConnection> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }

      // Check if already connected
      const existing = this.connections.get(peerId);
      if (existing && existing.open) {
        resolve(existing);
        return;
      }

      const conn = this.peer.connect(peerId, { reliable: true });

      conn.on('open', () => {
        this.connections.set(peerId, conn);
        console.log('[PeerService] Connected to:', peerId);
        resolve(conn);
      });

      conn.on('data', (data: unknown) => {
        this.handleMessage(data as PeerMessage, conn);
      });

      conn.on('close', () => {
        this.connections.delete(peerId);
      });

      conn.on('error', (err: unknown) => {
        console.error('[PeerService] Failed to connect to', peerId, ':', err);
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!conn.open) {
          reject(new Error(`Connection timeout to ${peerId}`));
        }
      }, 10000);
    });
  }

  /**
   * Send message to a specific peer
   */
  sendTo(peerId: string, message: Omit<PeerMessage, 'fromAddress' | 'fromIndex'>): boolean {
    const conn = this.connections.get(peerId);
    if (!conn || !conn.open) {
      console.warn('[PeerService] No connection to peer:', peerId);
      return false;
    }

    const fullMessage: PeerMessage = {
      ...message,
      fromAddress: this.myAddress,
      fromIndex: this.myIndex,
    } as PeerMessage;

    conn.send(fullMessage);
    return true;
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message: Omit<PeerMessage, 'fromAddress' | 'fromIndex'>): void {
    const fullMessage: PeerMessage = {
      ...message,
      fromAddress: this.myAddress,
      fromIndex: this.myIndex,
    } as PeerMessage;

    for (const [peerId, conn] of this.connections) {
      if (conn.open) {
        conn.send(fullMessage);
      } else {
        console.warn('[PeerService] Connection not open to:', peerId);
      }
    }
  }

  /**
   * Register a message handler
   */
  onMessage(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * Remove a message handler
   */
  offMessage(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: PeerMessage, conn: DataConnection): void {
    console.log('[PeerService] Received message:', message.type, 'from:', message.fromAddress);
    
    const handlers = this.messageHandlers.get(message.type) || [];
    for (const handler of handlers) {
      try {
        handler(message, conn);
      } catch (err) {
        console.error('[PeerService] Handler error:', err);
      }
    }
  }

  /**
   * Get connected peer count
   */
  getConnectedPeerCount(): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.open) count++;
    }
    return count;
  }

  /**
   * Get all connected peer IDs
   */
  getConnectedPeers(): string[] {
    const peers: string[] = [];
    for (const [peerId, conn] of this.connections) {
      if (conn.open) peers.push(peerId);
    }
    return peers;
  }

  /**
   * Check if connected to a specific peer
   */
  isConnectedTo(peerId: string): boolean {
    const conn = this.connections.get(peerId);
    return conn?.open ?? false;
  }

  /**
   * Disconnect from all peers and destroy
   */
  destroy(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.messageHandlers.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  /**
   * Get my peer ID
   */
  getMyPeerId(): string {
    return this.myPeerId;
  }

  /**
   * Check if peer is initialized and connected
   */
  isReady(): boolean {
    return this.peer !== null && !this.peer.destroyed;
  }
}

// Singleton instance
let peerServiceInstance: PeerService | null = null;

export function getPeerService(): PeerService {
  if (!peerServiceInstance) {
    peerServiceInstance = new PeerService();
  }
  return peerServiceInstance;
}

export function destroyPeerService(): void {
  if (peerServiceInstance) {
    peerServiceInstance.destroy();
    peerServiceInstance = null;
  }
}
