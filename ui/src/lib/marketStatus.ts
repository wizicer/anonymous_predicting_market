import type { Market, MarketStatus } from '@/types';

/**
 * Get the effective status of a market.
 * If on-chain status is 'active' but the market has expired, return 'expired'.
 * Otherwise, return the on-chain status.
 */
export function getEffectiveStatus(market: Market): MarketStatus {
  if (market.status === 'active' && new Date(market.expiresAt) <= new Date()) {
    return 'expired';
  }
  return market.status;
}
