/**
 * Reputation Registry Module
 * 
 * Manages device reputation scores based on task completion,
 * ratings, and historical performance.
 */

import EventEmitter from 'eventemitter3';
import { ReputationScore } from '../types';

export interface ReputationRegistryConfig {
  deviceId: string;
  initialReputation?: number;
  decayRate?: number;
  minRatingsForScore?: number;
}

export interface RatingEntry {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  rating: number;
  taskId?: string;
  timestamp: number;
  weight: number;
}

export class ReputationRegistry extends EventEmitter {
  private deviceId: string;
  private scores: Map<string, ReputationScore> = new Map();
  private ratings: Map<string, RatingEntry[]> = new Map();
  private decayRate: number;
  private minRatingsForScore: number;

  constructor(config: ReputationRegistryConfig) {
    super();
    this.deviceId = config.deviceId;
    this.decayRate = config.decayRate ?? 0.01;
    this.minRatingsForScore = config.minRatingsForScore ?? 3;

    // Initialize own reputation
    this.initializeReputation(config.deviceId, config.initialReputation ?? 3.0);
  }

  /**
   * Get reputation score for a device
   */
  async getScore(deviceId: string): Promise<ReputationScore | null> {
    const score = this.scores.get(deviceId);
    if (!score) {
      return null;
    }

    // Apply time decay
    const decayedScore = this.applyDecay(score);
    return decayedScore;
  }

  /**
   * Add a rating for a device
   */
  async addRating(params: {
    fromDeviceId: string;
    toDeviceId: string;
    rating: number;
    taskId?: string;
    weight?: number;
  }): Promise<void> {
    // Validate rating
    if (params.rating < 0 || params.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    const ratingEntry: RatingEntry = {
      id: `rating-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fromDeviceId: params.fromDeviceId,
      toDeviceId: params.toDeviceId,
      rating: params.rating,
      taskId: params.taskId,
      timestamp: Date.now(),
      weight: params.weight ?? 1.0
    };

    // Store rating
    const deviceRatings = this.ratings.get(params.toDeviceId) || [];
    deviceRatings.push(ratingEntry);
    this.ratings.set(params.toDeviceId, deviceRatings);

    // Update score
    await this.recalculateScore(params.toDeviceId);

    this.emit('rating:added', ratingEntry);
  }

  /**
   * Record task completion (affects reputation)
   */
  async recordTaskCompletion(params: {
    deviceId: string;
    taskId: string;
    success: boolean;
    duration?: number;
    expectedDuration?: number;
  }): Promise<void> {
    const score = this.scores.get(params.deviceId);
    if (!score) {
      this.initializeReputation(params.deviceId);
    }

    const currentScore = this.scores.get(params.deviceId)!;

    // Update counters
    currentScore.totalTasks++;
    if (params.success) {
      currentScore.successfulTasks++;
    } else {
      currentScore.failedTasks++;
    }

    // Calculate performance bonus/penalty
    let performanceModifier = 0;
    if (params.success && params.duration && params.expectedDuration) {
      if (params.duration < params.expectedDuration * 0.8) {
        performanceModifier = 0.1; // Fast completion bonus
      } else if (params.duration > params.expectedDuration * 1.5) {
        performanceModifier = -0.05; // Slow completion penalty
      }
    }

    // Update score based on success rate
    const successRate = currentScore.successfulTasks / currentScore.totalTasks;
    const baseScore = successRate * 5;
    
    currentScore.score = Math.min(5, Math.max(0, 
      baseScore * 0.7 + currentScore.averageRating * 0.3 + performanceModifier
    ));
    currentScore.lastUpdated = Date.now();

    this.scores.set(params.deviceId, currentScore);
    this.emit('reputation:updated', currentScore);
  }

  /**
   * Get reputation history for a device
   */
  getRatingHistory(deviceId: string, limit?: number): RatingEntry[] {
    const ratings = this.ratings.get(deviceId) || [];
    const sorted = [...ratings].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get devices ranked by reputation
   */
  getLeaderboard(limit: number = 10): ReputationScore[] {
    const scores = Array.from(this.scores.values());
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Check if device meets minimum reputation requirement
   */
  meetsRequirement(deviceId: string, minReputation: number): boolean {
    const score = this.scores.get(deviceId);
    if (!score) {
      return false;
    }
    return score.score >= minReputation;
  }

  /**
   * Get trust level based on reputation
   */
  getTrustLevel(deviceId: string): 'untrusted' | 'low' | 'medium' | 'high' | 'verified' {
    const score = this.scores.get(deviceId);
    if (!score) {
      return 'untrusted';
    }

    if (score.totalTasks < this.minRatingsForScore) {
      return 'untrusted';
    }

    if (score.score >= 4.5 && score.totalTasks >= 50) {
      return 'verified';
    } else if (score.score >= 4.0) {
      return 'high';
    } else if (score.score >= 3.0) {
      return 'medium';
    } else if (score.score >= 2.0) {
      return 'low';
    }

    return 'untrusted';
  }

  /**
   * Calculate weighted average rating
   */
  private calculateWeightedRating(ratings: RatingEntry[]): number {
    if (ratings.length === 0) {
      return 3.0;
    }

    // Recent ratings have more weight
    const now = Date.now();
    const weightedSum = ratings.reduce((sum, r) => {
      const age = (now - r.timestamp) / (1000 * 60 * 60 * 24); // days
      const timeWeight = Math.exp(-this.decayRate * age);
      return sum + r.rating * r.weight * timeWeight;
    }, 0);

    const totalWeight = ratings.reduce((sum, r) => {
      const age = (now - r.timestamp) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.exp(-this.decayRate * age);
      return sum + r.weight * timeWeight;
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 3.0;
  }

  /**
   * Recalculate reputation score for a device
   */
  private async recalculateScore(deviceId: string): Promise<void> {
    const ratings = this.ratings.get(deviceId) || [];
    const score = this.scores.get(deviceId);

    if (!score) {
      this.initializeReputation(deviceId);
    }

    const currentScore = this.scores.get(deviceId)!;
    currentScore.averageRating = this.calculateWeightedRating(ratings);

    // Combine success rate and ratings
    if (currentScore.totalTasks > 0) {
      const successRate = currentScore.successfulTasks / currentScore.totalTasks;
      currentScore.score = successRate * 2.5 + currentScore.averageRating * 0.5;
    } else {
      currentScore.score = currentScore.averageRating;
    }

    currentScore.score = Math.min(5, Math.max(0, currentScore.score));
    currentScore.lastUpdated = Date.now();

    this.scores.set(deviceId, currentScore);
    this.emit('reputation:updated', currentScore);
  }

  /**
   * Apply time decay to reputation score
   */
  private applyDecay(score: ReputationScore): ReputationScore {
    const daysSinceUpdate = (Date.now() - score.lastUpdated) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 1) {
      return score;
    }

    const decayFactor = Math.exp(-this.decayRate * daysSinceUpdate);
    const decayedScore = 3.0 + (score.score - 3.0) * decayFactor;

    return {
      ...score,
      score: Math.max(0, Math.min(5, decayedScore))
    };
  }

  /**
   * Initialize reputation for a new device
   */
  private initializeReputation(deviceId: string, initialScore: number = 3.0): void {
    const score: ReputationScore = {
      deviceId,
      score: initialScore,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageRating: initialScore,
      lastUpdated: Date.now()
    };

    this.scores.set(deviceId, score);
    this.ratings.set(deviceId, []);
  }

  /**
   * Get statistics for a device
   */
  getStats(deviceId: string) {
    const score = this.scores.get(deviceId);
    const ratings = this.ratings.get(deviceId) || [];

    if (!score) {
      return null;
    }

    return {
      ...score,
      trustLevel: this.getTrustLevel(deviceId),
      totalRatings: ratings.length,
      recentRatings: ratings.filter(r => 
        Date.now() - r.timestamp < 7 * 24 * 60 * 60 * 1000
      ).length
    };
  }

  /**
   * Report suspicious activity
   */
  async reportDevice(params: {
    reporterId: string;
    targetId: string;
    reason: string;
    evidence?: string;
  }): Promise<void> {
    this.emit('device:reported', params);
    
    // Apply penalty
    const score = this.scores.get(params.targetId);
    if (score) {
      score.score = Math.max(0, score.score - 0.5);
      score.lastUpdated = Date.now();
      this.emit('reputation:updated', score);
    }
  }
}

export default ReputationRegistry;
