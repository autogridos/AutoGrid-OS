/**
 * Utility functions for AutoGrid OS
 */

import { Location } from '../types';

/**
 * Calculate Euclidean distance between two locations
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const dx = loc1.x - loc2.x;
  const dy = loc1.y - loc2.y;
  const dz = (loc1.z || 0) - (loc2.z || 0);
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate Manhattan distance (grid-based)
 */
export function calculateManhattanDistance(loc1: Location, loc2: Location): number {
  const dx = Math.abs(loc1.x - loc2.x);
  const dy = Math.abs(loc1.y - loc2.y);
  const dz = Math.abs((loc1.z || 0) - (loc2.z || 0));
  
  return dx + dy + dz;
}

/**
 * Validate device ID format
 */
export function validateDeviceId(deviceId: string): boolean {
  // Device ID should be alphanumeric with hyphens
  const pattern = /^[a-zA-Z0-9-]+$/;
  return pattern.test(deviceId) && deviceId.length >= 3 && deviceId.length <= 64;
}

/**
 * Generate a random device ID
 */
export function generateDeviceId(prefix: string = 'device'): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${random}`;
}

/**
 * Format token amount with decimals
 */
export function formatTokens(amount: number, decimals: number = 2): string {
  return amount.toFixed(decimals);
}

/**
 * Calculate task priority weight
 */
export function getPriorityWeight(priority: string): number {
  const weights = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1
  };
  return weights[priority as keyof typeof weights] || 2;
}

/**
 * Estimate task duration based on distance and complexity
 */
export function estimateTaskDuration(
  distance: number,
  complexity: number = 1,
  speedFactor: number = 1
): number {
  // Base time is distance divided by speed, multiplied by complexity
  const baseTime = (distance / speedFactor) * complexity;
  
  // Add 10% buffer for safety
  return Math.ceil(baseTime * 1.1);
}

/**
 * Calculate optimal price based on various factors
 */
export function calculateOptimalPrice(params: {
  basePrice: number;
  distance: number;
  reputation: number;
  urgency: number;
  competition: number;
}): number {
  let price = params.basePrice;
  
  // Distance factor (0.8 - 1.2)
  const distanceFactor = 0.8 + (Math.min(params.distance, 100) / 100) * 0.4;
  price *= distanceFactor;
  
  // Reputation factor (0.9 - 1.1)
  const reputationFactor = 0.9 + (params.reputation / 5) * 0.2;
  price *= reputationFactor;
  
  // Urgency factor (1.0 - 1.5)
  const urgencyFactor = 1.0 + (params.urgency / 10) * 0.5;
  price *= urgencyFactor;
  
  // Competition factor (0.8 - 1.0)
  const competitionFactor = 1.0 - (Math.min(params.competition, 10) / 10) * 0.2;
  price *= competitionFactor;
  
  return Math.round(price);
}

/**
 * Validate task payload structure
 */
export function validateTaskPayload(payload: any, requiredFields: string[]): boolean {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  return requiredFields.every(field => field in payload);
}

/**
 * Create a simple hash for data integrity
 */
export function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if task deadline is approaching
 */
export function isDeadlineApproaching(deadline: number, thresholdMs: number = 300000): boolean {
  const timeRemaining = deadline - Date.now();
  return timeRemaining > 0 && timeRemaining <= thresholdMs;
}

/**
 * Convert milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
