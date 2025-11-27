/**
 * Insurance & Collateral Module
 * 
 * Provides task insurance, collateral management, and risk pooling
 * for autonomous device operations.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus } from '../types';

// ==================== Types ====================

export enum InsuranceType {
  TASK_FAILURE = 'task-failure',
  EQUIPMENT_DAMAGE = 'equipment-damage',
  DEADLINE_MISS = 'deadline-miss',
  QUALITY_ISSUE = 'quality-issue',
  COMPREHENSIVE = 'comprehensive'
}

export enum ClaimStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under-review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  DISPUTED = 'disputed'
}

export enum PoolStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed'
}

export interface InsurancePolicy {
  id: string;
  taskId: string;
  insuredDeviceId: string;
  type: InsuranceType;
  coverage: number;          // Maximum payout amount
  premium: number;           // Cost of insurance
  deductible: number;        // Amount insured pays first
  providerId: string;        // Insurance pool or device
  startTime: number;
  endTime: number;
  terms: PolicyTerms;
  status: 'active' | 'expired' | 'claimed' | 'cancelled';
  createdAt: number;
}

export interface PolicyTerms {
  coveredEvents: string[];
  exclusions: string[];
  maxClaimsPerPolicy: number;
  waitingPeriod: number;     // Time before claims can be made
  proofRequired: boolean;
  arbitrationRequired: boolean;
  autoApproveThreshold?: number;  // Auto-approve claims under this amount
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  taskId: string;
  claimantId: string;
  type: InsuranceType;
  amount: number;
  reason: string;
  evidence: ClaimEvidence[];
  status: ClaimStatus;
  reviewerId?: string;
  reviewNotes?: string;
  paidAmount?: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface ClaimEvidence {
  type: 'log' | 'sensor' | 'witness' | 'proof' | 'photo' | 'telemetry';
  data: any;
  timestamp: number;
  source: string;
  verified: boolean;
}

export interface InsurancePool {
  id: string;
  name: string;
  type: InsuranceType[];
  totalFunds: number;
  reservedFunds: number;     // Funds reserved for pending claims
  availableFunds: number;
  members: PoolMember[];
  policies: string[];        // Active policy IDs
  claims: string[];          // Claim IDs
  parameters: PoolParameters;
  status: PoolStatus;
  performance: PoolPerformance;
  createdAt: number;
}

export interface PoolMember {
  deviceId: string;
  contribution: number;
  share: number;             // Percentage of pool
  joinedAt: number;
  claimsMade: number;
  claimsPaid: number;
  reputation: number;
}

export interface PoolParameters {
  minContribution: number;
  maxCoveragePerPolicy: number;
  premiumRate: number;       // Percentage of coverage
  deductibleRate: number;    // Percentage of claim
  reserveRatio: number;      // Minimum reserve percentage
  profitShareRatio: number;  // How profits are distributed
  votingThreshold: number;   // For governance decisions
}

export interface PoolPerformance {
  totalPremiumsCollected: number;
  totalClaimsPaid: number;
  lossRatio: number;         // Claims paid / premiums collected
  activePolicies: number;
  averagePremium: number;
  averageClaim: number;
  profitability: number;
}

export interface Collateral {
  id: string;
  taskId: string;
  providerId: string;        // Device providing collateral
  beneficiaryId: string;     // Device that receives if forfeited
  amount: number;
  type: 'deposit' | 'bond' | 'escrow';
  status: 'locked' | 'released' | 'forfeited' | 'disputed';
  conditions: CollateralConditions;
  lockedAt: number;
  releaseAt?: number;
  forfeitedAt?: number;
}

export interface CollateralConditions {
  releaseOnSuccess: boolean;
  forfeitOnFailure: boolean;
  forfeitOnTimeout: boolean;
  partialForfeitAllowed: boolean;
  disputeWindow: number;     // Time to dispute before auto-release
  arbitrator?: string;       // Device ID for disputes
}

export interface RiskAssessment {
  deviceId: string;
  taskId?: string;
  riskScore: number;         // 0-100
  factors: RiskFactor[];
  recommendedPremium: number;
  recommendedCoverage: number;
  recommendedCollateral: number;
  timestamp: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface InsuranceQuote {
  id: string;
  taskId: string;
  deviceId: string;
  type: InsuranceType;
  coverage: number;
  premium: number;
  deductible: number;
  providerId: string;
  validUntil: number;
  riskAssessment: RiskAssessment;
}

// ==================== Insurance Module ====================

export interface InsuranceModuleConfig {
  deviceId: string;
  defaultPool?: string;
  autoInsure?: boolean;
  maxPremiumRate?: number;
}

export class InsuranceModule extends EventEmitter {
  private deviceId: string;
  private config: InsuranceModuleConfig;
  private policies: Map<string, InsurancePolicy> = new Map();
  private claims: Map<string, InsuranceClaim> = new Map();
  private pools: Map<string, InsurancePool> = new Map();
  private collaterals: Map<string, Collateral> = new Map();
  private quotes: Map<string, InsuranceQuote> = new Map();
  private riskHistory: Map<string, RiskAssessment[]> = new Map();

  constructor(config: InsuranceModuleConfig) {
    super();
    this.deviceId = config.deviceId;
    this.config = config;

    // Create default fleet pool
    this.createDefaultPool();
  }

  // ==================== Policy Management ====================

  async getQuote(params: {
    taskId: string;
    type: InsuranceType;
    coverage: number;
    duration?: number;
    providerId?: string;
  }): Promise<InsuranceQuote> {
    const riskAssessment = await this.assessRisk(this.deviceId, params.taskId);
    
    const providerId = params.providerId || this.config.defaultPool || 'fleet-insurance-pool';
    const pool = this.pools.get(providerId);
    
    const premiumRate = pool?.parameters.premiumRate || 0.05;
    const deductibleRate = pool?.parameters.deductibleRate || 0.1;
    
    // Adjust premium based on risk
    const riskMultiplier = 1 + (riskAssessment.riskScore - 50) / 100;
    const premium = Math.round(params.coverage * premiumRate * riskMultiplier);
    const deductible = Math.round(params.coverage * deductibleRate);

    const quote: InsuranceQuote = {
      id: uuidv4(),
      taskId: params.taskId,
      deviceId: this.deviceId,
      type: params.type,
      coverage: params.coverage,
      premium,
      deductible,
      providerId,
      validUntil: Date.now() + (params.duration || 3600000),
      riskAssessment
    };

    this.quotes.set(quote.id, quote);
    this.emit('quote:generated', quote);

    return quote;
  }

  async insureTask(
    taskId: string,
    params: {
      coverage: number;
      provider?: string;
      type?: InsuranceType;
      quoteId?: string;
    }
  ): Promise<InsurancePolicy> {
    let quote: InsuranceQuote | undefined;
    
    if (params.quoteId) {
      quote = this.quotes.get(params.quoteId);
      if (!quote || Date.now() > quote.validUntil) {
        throw new Error('Quote expired or not found');
      }
    } else {
      quote = await this.getQuote({
        taskId,
        type: params.type || InsuranceType.TASK_FAILURE,
        coverage: params.coverage,
        providerId: params.provider
      });
    }

    const pool = this.pools.get(quote.providerId);
    if (!pool) {
      throw new Error('Insurance provider not found');
    }

    // Check pool has sufficient funds
    if (pool.availableFunds < quote.coverage) {
      throw new Error('Insurance pool has insufficient funds');
    }

    const policy: InsurancePolicy = {
      id: uuidv4(),
      taskId,
      insuredDeviceId: this.deviceId,
      type: quote.type,
      coverage: quote.coverage,
      premium: quote.premium,
      deductible: quote.deductible,
      providerId: quote.providerId,
      startTime: Date.now(),
      endTime: Date.now() + 86400000, // 24 hours default
      terms: {
        coveredEvents: this.getCoveredEvents(quote.type),
        exclusions: ['intentional_damage', 'fraud', 'unauthorized_modification'],
        maxClaimsPerPolicy: 1,
        waitingPeriod: 0,
        proofRequired: true,
        arbitrationRequired: false,
        autoApproveThreshold: quote.coverage * 0.1
      },
      status: 'active',
      createdAt: Date.now()
    };

    // Reserve funds in pool
    pool.reservedFunds += quote.coverage;
    pool.availableFunds -= quote.coverage;
    pool.totalFunds += quote.premium;
    pool.availableFunds += quote.premium;
    pool.policies.push(policy.id);

    this.policies.set(policy.id, policy);
    this.updatePoolPerformance(pool);

    this.emit('policy:created', policy);

    return policy;
  }

  async cancelPolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    if (policy.status !== 'active') {
      throw new Error('Policy cannot be cancelled');
    }

    const pool = this.pools.get(policy.providerId);
    if (pool) {
      // Release reserved funds
      pool.reservedFunds -= policy.coverage;
      pool.availableFunds += policy.coverage;
      
      // Partial refund if early cancellation
      const elapsed = Date.now() - policy.startTime;
      const duration = policy.endTime - policy.startTime;
      const refundRatio = Math.max(0, 1 - elapsed / duration);
      const refund = Math.round(policy.premium * refundRatio * 0.8); // 80% of unused premium
      
      if (refund > 0) {
        pool.totalFunds -= refund;
        pool.availableFunds -= refund;
      }
    }

    policy.status = 'cancelled';
    this.emit('policy:cancelled', { policyId, policy });
  }

  getPolicy(policyId: string): InsurancePolicy | undefined {
    return this.policies.get(policyId);
  }

  getActivePolicies(): InsurancePolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.status === 'active' && p.insuredDeviceId === this.deviceId);
  }

  // ==================== Claims Management ====================

  async fileClaim(params: {
    policyId: string;
    amount: number;
    reason: string;
    evidence?: ClaimEvidence[];
  }): Promise<InsuranceClaim> {
    const policy = this.policies.get(params.policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    if (policy.status !== 'active') {
      throw new Error('Policy is not active');
    }

    if (policy.insuredDeviceId !== this.deviceId) {
      throw new Error('Not authorized to file claim on this policy');
    }

    // Check waiting period
    if (Date.now() - policy.startTime < policy.terms.waitingPeriod) {
      throw new Error('Claim filed during waiting period');
    }

    const claimAmount = Math.min(params.amount, policy.coverage - policy.deductible);

    const claim: InsuranceClaim = {
      id: uuidv4(),
      policyId: params.policyId,
      taskId: policy.taskId,
      claimantId: this.deviceId,
      type: policy.type,
      amount: claimAmount,
      reason: params.reason,
      evidence: params.evidence || [],
      status: ClaimStatus.PENDING,
      createdAt: Date.now()
    };

    this.claims.set(claim.id, claim);

    // Update policy
    policy.status = 'claimed';

    // Auto-approve small claims
    if (policy.terms.autoApproveThreshold && claimAmount <= policy.terms.autoApproveThreshold) {
      await this.approveClaim(claim.id, 'Auto-approved: below threshold');
    }

    const pool = this.pools.get(policy.providerId);
    if (pool) {
      pool.claims.push(claim.id);
    }

    this.emit('claim:filed', claim);

    return claim;
  }

  async addEvidence(claimId: string, evidence: ClaimEvidence): Promise<void> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.status !== ClaimStatus.PENDING && claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new Error('Cannot add evidence to resolved claim');
    }

    claim.evidence.push(evidence);
    this.emit('claim:evidence-added', { claimId, evidence });
  }

  async reviewClaim(claimId: string, reviewerId: string): Promise<InsuranceClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    claim.status = ClaimStatus.UNDER_REVIEW;
    claim.reviewerId = reviewerId;

    this.emit('claim:under-review', claim);

    return claim;
  }

  async approveClaim(claimId: string, notes?: string): Promise<InsuranceClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const policy = this.policies.get(claim.policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    claim.status = ClaimStatus.APPROVED;
    claim.reviewNotes = notes;
    claim.resolvedAt = Date.now();

    // Process payment
    await this.processClaimPayment(claim, policy);

    return claim;
  }

  async rejectClaim(claimId: string, reason: string): Promise<InsuranceClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    claim.status = ClaimStatus.REJECTED;
    claim.reviewNotes = reason;
    claim.resolvedAt = Date.now();

    // Release reserved funds
    const policy = this.policies.get(claim.policyId);
    if (policy) {
      const pool = this.pools.get(policy.providerId);
      if (pool) {
        pool.reservedFunds -= policy.coverage;
        pool.availableFunds += policy.coverage;
      }
    }

    this.emit('claim:rejected', claim);

    return claim;
  }

  async disputeClaim(claimId: string, reason: string): Promise<InsuranceClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    claim.status = ClaimStatus.DISPUTED;
    claim.reviewNotes = `Dispute: ${reason}`;

    this.emit('claim:disputed', claim);

    return claim;
  }

  private async processClaimPayment(claim: InsuranceClaim, policy: InsurancePolicy): Promise<void> {
    const pool = this.pools.get(policy.providerId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    const payoutAmount = claim.amount;

    // Update pool funds
    pool.reservedFunds -= policy.coverage;
    pool.totalFunds -= payoutAmount;
    
    claim.status = ClaimStatus.PAID;
    claim.paidAmount = payoutAmount;

    this.updatePoolPerformance(pool);

    this.emit('claim:paid', { claim, amount: payoutAmount });
  }

  getClaim(claimId: string): InsuranceClaim | undefined {
    return this.claims.get(claimId);
  }

  getMyClaims(): InsuranceClaim[] {
    return Array.from(this.claims.values())
      .filter(c => c.claimantId === this.deviceId);
  }

  // ==================== Collateral Management ====================

  async lockCollateral(params: {
    taskId: string;
    amount: number;
    beneficiaryId: string;
    type?: 'deposit' | 'bond' | 'escrow';
    conditions?: Partial<CollateralConditions>;
  }): Promise<Collateral> {
    const collateral: Collateral = {
      id: uuidv4(),
      taskId: params.taskId,
      providerId: this.deviceId,
      beneficiaryId: params.beneficiaryId,
      amount: params.amount,
      type: params.type || 'deposit',
      status: 'locked',
      conditions: {
        releaseOnSuccess: true,
        forfeitOnFailure: true,
        forfeitOnTimeout: true,
        partialForfeitAllowed: false,
        disputeWindow: 3600000, // 1 hour
        ...params.conditions
      },
      lockedAt: Date.now()
    };

    this.collaterals.set(collateral.id, collateral);
    this.emit('collateral:locked', collateral);

    return collateral;
  }

  async releaseCollateral(collateralId: string, reason?: string): Promise<void> {
    const collateral = this.collaterals.get(collateralId);
    if (!collateral) {
      throw new Error('Collateral not found');
    }

    if (collateral.status !== 'locked') {
      throw new Error('Collateral not locked');
    }

    collateral.status = 'released';
    collateral.releaseAt = Date.now();

    this.emit('collateral:released', { collateral, reason });
  }

  async forfeitCollateral(collateralId: string, reason: string): Promise<void> {
    const collateral = this.collaterals.get(collateralId);
    if (!collateral) {
      throw new Error('Collateral not found');
    }

    if (collateral.status !== 'locked') {
      throw new Error('Collateral not locked');
    }

    collateral.status = 'forfeited';
    collateral.forfeitedAt = Date.now();

    this.emit('collateral:forfeited', { collateral, reason });
  }

  async disputeCollateral(collateralId: string, reason: string): Promise<void> {
    const collateral = this.collaterals.get(collateralId);
    if (!collateral) {
      throw new Error('Collateral not found');
    }

    collateral.status = 'disputed';

    this.emit('collateral:disputed', { collateral, reason });
  }

  getCollateral(collateralId: string): Collateral | undefined {
    return this.collaterals.get(collateralId);
  }

  getMyCollaterals(): Collateral[] {
    return Array.from(this.collaterals.values())
      .filter(c => c.providerId === this.deviceId || c.beneficiaryId === this.deviceId);
  }

  // ==================== Insurance Pool Management ====================

  async createPool(params: {
    name: string;
    types: InsuranceType[];
    initialFunds: number;
    parameters?: Partial<PoolParameters>;
  }): Promise<InsurancePool> {
    const pool: InsurancePool = {
      id: uuidv4(),
      name: params.name,
      type: params.types,
      totalFunds: params.initialFunds,
      reservedFunds: 0,
      availableFunds: params.initialFunds,
      members: [{
        deviceId: this.deviceId,
        contribution: params.initialFunds,
        share: 100,
        joinedAt: Date.now(),
        claimsMade: 0,
        claimsPaid: 0,
        reputation: 5.0
      }],
      policies: [],
      claims: [],
      parameters: {
        minContribution: 100,
        maxCoveragePerPolicy: params.initialFunds * 0.1,
        premiumRate: 0.05,
        deductibleRate: 0.1,
        reserveRatio: 0.2,
        profitShareRatio: 0.7,
        votingThreshold: 0.5,
        ...params.parameters
      },
      status: PoolStatus.ACTIVE,
      performance: {
        totalPremiumsCollected: 0,
        totalClaimsPaid: 0,
        lossRatio: 0,
        activePolicies: 0,
        averagePremium: 0,
        averageClaim: 0,
        profitability: 0
      },
      createdAt: Date.now()
    };

    this.pools.set(pool.id, pool);
    this.emit('pool:created', pool);

    return pool;
  }

  async joinPool(poolId: string, contribution: number): Promise<boolean> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (pool.status !== PoolStatus.ACTIVE) {
      throw new Error('Pool is not active');
    }

    if (contribution < pool.parameters.minContribution) {
      throw new Error('Contribution below minimum');
    }

    // Check if already member
    const existingMember = pool.members.find(m => m.deviceId === this.deviceId);
    if (existingMember) {
      existingMember.contribution += contribution;
    } else {
      pool.members.push({
        deviceId: this.deviceId,
        contribution,
        share: 0, // Will be recalculated
        joinedAt: Date.now(),
        claimsMade: 0,
        claimsPaid: 0,
        reputation: 3.0
      });
    }

    pool.totalFunds += contribution;
    pool.availableFunds += contribution;

    // Recalculate shares
    this.recalculatePoolShares(pool);

    this.emit('pool:member-joined', { poolId, deviceId: this.deviceId, contribution });

    return true;
  }

  async leavePool(poolId: string): Promise<number> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    const memberIndex = pool.members.findIndex(m => m.deviceId === this.deviceId);
    if (memberIndex === -1) {
      throw new Error('Not a member of this pool');
    }

    const member = pool.members[memberIndex];
    
    // Calculate withdrawal amount based on share and available funds
    const withdrawalAmount = Math.floor(pool.availableFunds * (member.share / 100));

    pool.members.splice(memberIndex, 1);
    pool.totalFunds -= withdrawalAmount;
    pool.availableFunds -= withdrawalAmount;

    this.recalculatePoolShares(pool);

    this.emit('pool:member-left', { poolId, deviceId: this.deviceId, withdrawal: withdrawalAmount });

    return withdrawalAmount;
  }

  getPool(poolId: string): InsurancePool | undefined {
    return this.pools.get(poolId);
  }

  getAvailablePools(): InsurancePool[] {
    return Array.from(this.pools.values())
      .filter(p => p.status === PoolStatus.ACTIVE);
  }

  private recalculatePoolShares(pool: InsurancePool): void {
    const totalContribution = pool.members.reduce((sum, m) => sum + m.contribution, 0);
    
    for (const member of pool.members) {
      member.share = (member.contribution / totalContribution) * 100;
    }
  }

  private updatePoolPerformance(pool: InsurancePool): void {
    const paidClaims = Array.from(this.claims.values())
      .filter(c => pool.claims.includes(c.id) && c.status === ClaimStatus.PAID);
    
    const activePolicies = Array.from(this.policies.values())
      .filter(p => pool.policies.includes(p.id) && p.status === 'active');

    const totalPremiums = activePolicies.reduce((sum, p) => sum + p.premium, 0);
    const totalClaims = paidClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    pool.performance = {
      totalPremiumsCollected: totalPremiums,
      totalClaimsPaid: totalClaims,
      lossRatio: totalPremiums > 0 ? totalClaims / totalPremiums : 0,
      activePolicies: activePolicies.length,
      averagePremium: activePolicies.length > 0 ? totalPremiums / activePolicies.length : 0,
      averageClaim: paidClaims.length > 0 ? totalClaims / paidClaims.length : 0,
      profitability: totalPremiums - totalClaims
    };
  }

  private createDefaultPool(): void {
    const defaultPool: InsurancePool = {
      id: 'fleet-insurance-pool',
      name: 'Fleet Insurance Pool',
      type: [InsuranceType.TASK_FAILURE, InsuranceType.DEADLINE_MISS, InsuranceType.QUALITY_ISSUE],
      totalFunds: 100000,
      reservedFunds: 0,
      availableFunds: 100000,
      members: [],
      policies: [],
      claims: [],
      parameters: {
        minContribution: 100,
        maxCoveragePerPolicy: 10000,
        premiumRate: 0.05,
        deductibleRate: 0.1,
        reserveRatio: 0.2,
        profitShareRatio: 0.7,
        votingThreshold: 0.5
      },
      status: PoolStatus.ACTIVE,
      performance: {
        totalPremiumsCollected: 0,
        totalClaimsPaid: 0,
        lossRatio: 0,
        activePolicies: 0,
        averagePremium: 0,
        averageClaim: 0,
        profitability: 0
      },
      createdAt: Date.now()
    };

    this.pools.set(defaultPool.id, defaultPool);
  }

  // ==================== Risk Assessment ====================

  async assessRisk(deviceId: string, taskId?: string): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 50; // Base score

    // Get device history
    const deviceClaims = Array.from(this.claims.values())
      .filter(c => c.claimantId === deviceId);
    
    // Claims history factor
    const claimsCount = deviceClaims.length;
    const claimsFactor: RiskFactor = {
      name: 'Claims History',
      weight: 0.3,
      value: claimsCount,
      impact: claimsCount > 2 ? 'negative' : claimsCount === 0 ? 'positive' : 'neutral',
      description: `${claimsCount} previous claims`
    };
    factors.push(claimsFactor);
    totalScore += claimsCount > 2 ? 15 : claimsCount === 0 ? -10 : 0;

    // Policy history factor
    const devicePolicies = Array.from(this.policies.values())
      .filter(p => p.insuredDeviceId === deviceId);
    const successfulPolicies = devicePolicies.filter(p => p.status === 'expired').length;
    const policyFactor: RiskFactor = {
      name: 'Policy History',
      weight: 0.2,
      value: successfulPolicies,
      impact: successfulPolicies > 5 ? 'positive' : 'neutral',
      description: `${successfulPolicies} policies without claims`
    };
    factors.push(policyFactor);
    totalScore -= successfulPolicies > 5 ? 10 : 0;

    // Collateral history factor
    const deviceCollaterals = Array.from(this.collaterals.values())
      .filter(c => c.providerId === deviceId);
    const forfeitedCount = deviceCollaterals.filter(c => c.status === 'forfeited').length;
    const collateralFactor: RiskFactor = {
      name: 'Collateral History',
      weight: 0.2,
      value: forfeitedCount,
      impact: forfeitedCount > 0 ? 'negative' : 'positive',
      description: `${forfeitedCount} forfeited collaterals`
    };
    factors.push(collateralFactor);
    totalScore += forfeitedCount * 10;

    // Pool membership factor
    const memberPools = Array.from(this.pools.values())
      .filter(p => p.members.some(m => m.deviceId === deviceId));
    const poolMemberFactor: RiskFactor = {
      name: 'Pool Membership',
      weight: 0.15,
      value: memberPools.length,
      impact: memberPools.length > 0 ? 'positive' : 'neutral',
      description: `Member of ${memberPools.length} pools`
    };
    factors.push(poolMemberFactor);
    totalScore -= memberPools.length * 5;

    // Normalize score
    totalScore = Math.max(0, Math.min(100, totalScore));

    const assessment: RiskAssessment = {
      deviceId,
      taskId,
      riskScore: totalScore,
      factors,
      recommendedPremium: Math.round(1000 * (1 + (totalScore - 50) / 100)),
      recommendedCoverage: Math.round(10000 * (1 - totalScore / 200)),
      recommendedCollateral: Math.round(500 * (1 + totalScore / 100)),
      timestamp: Date.now()
    };

    // Store in history
    const history = this.riskHistory.get(deviceId) || [];
    history.push(assessment);
    this.riskHistory.set(deviceId, history.slice(-10)); // Keep last 10

    this.emit('risk:assessed', assessment);

    return assessment;
  }

  getRiskHistory(deviceId: string): RiskAssessment[] {
    return this.riskHistory.get(deviceId) || [];
  }

  // ==================== Task Integration ====================

  async handleTaskCompletion(task: Task, success: boolean): Promise<void> {
    // Find policies for this task
    const taskPolicies = Array.from(this.policies.values())
      .filter(p => p.taskId === task.id && p.status === 'active');

    // Find collaterals for this task
    const taskCollaterals = Array.from(this.collaterals.values())
      .filter(c => c.taskId === task.id && c.status === 'locked');

    if (success) {
      // Release collaterals
      for (const collateral of taskCollaterals) {
        if (collateral.conditions.releaseOnSuccess) {
          await this.releaseCollateral(collateral.id, 'Task completed successfully');
        }
      }

      // Expire policies without claims
      for (const policy of taskPolicies) {
        policy.status = 'expired';
        
        // Release reserved funds
        const pool = this.pools.get(policy.providerId);
        if (pool) {
          pool.reservedFunds -= policy.coverage;
          pool.availableFunds += policy.coverage;
          this.updatePoolPerformance(pool);
        }
      }
    } else {
      // Forfeit collaterals
      for (const collateral of taskCollaterals) {
        if (collateral.conditions.forfeitOnFailure) {
          await this.forfeitCollateral(collateral.id, 'Task failed');
        }
      }

      // Policies remain for claims
      this.emit('task:failed-policies-claimable', { taskId: task.id, policies: taskPolicies });
    }
  }

  // ==================== Helpers ====================

  private getCoveredEvents(type: InsuranceType): string[] {
    switch (type) {
      case InsuranceType.TASK_FAILURE:
        return ['execution_error', 'hardware_failure', 'software_bug', 'power_loss'];
      case InsuranceType.EQUIPMENT_DAMAGE:
        return ['collision', 'wear_tear', 'environmental_damage', 'malfunction'];
      case InsuranceType.DEADLINE_MISS:
        return ['late_completion', 'partial_completion', 'delayed_start'];
      case InsuranceType.QUALITY_ISSUE:
        return ['below_standards', 'defect', 'incomplete_work'];
      case InsuranceType.COMPREHENSIVE:
        return [
          'execution_error', 'hardware_failure', 'software_bug', 'power_loss',
          'collision', 'wear_tear', 'environmental_damage', 'malfunction',
          'late_completion', 'partial_completion', 'below_standards'
        ];
      default:
        return [];
    }
  }

  // ==================== Statistics ====================

  getStatistics(): {
    totalPolicies: number;
    activePolicies: number;
    totalClaims: number;
    pendingClaims: number;
    approvedClaims: number;
    totalCollaterals: number;
    lockedCollaterals: number;
    pools: number;
  } {
    const policies = Array.from(this.policies.values());
    const claims = Array.from(this.claims.values());
    const collaterals = Array.from(this.collaterals.values());

    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      totalClaims: claims.length,
      pendingClaims: claims.filter(c => c.status === ClaimStatus.PENDING).length,
      approvedClaims: claims.filter(c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length,
      totalCollaterals: collaterals.length,
      lockedCollaterals: collaterals.filter(c => c.status === 'locked').length,
      pools: this.pools.size
    };
  }
}

export default InsuranceModule;
