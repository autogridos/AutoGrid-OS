/**
 * Core type definitions for AutoGrid OS
 */

export enum DeviceType {
  WAREHOUSE = 'warehouse',
  MEDICAL = 'medical',
  MANUFACTURING = 'manufacturing',
  CLEANING = 'cleaning',
  TRANSPORT = 'transport',
  SERVICE = 'service',
  CUSTOM = 'custom'
}

export enum TaskStatus {
  PENDING = 'pending',
  BIDDING = 'bidding',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface DeviceConfig {
  deviceId: string;
  deviceType: DeviceType;
  privateKey: string;
  capabilities: string[];
  location?: Location;
  metadata?: Record<string, any>;
}

export interface Location {
  x: number;
  y: number;
  z?: number;
  floor?: number;
  area?: string;
}

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  publisherId: string;
  payload: Record<string, any>;
  requirements: TaskRequirements;
  reward: number;
  deadline?: number;
  createdAt: number;
  assignedTo?: string;
  completedAt?: number;
}

export interface TaskRequirements {
  capabilities: string[];
  minReputation?: number;
  maxDistance?: number;
  estimatedDuration?: number;
}

export interface Bid {
  id: string;
  taskId: string;
  deviceId: string;
  price: number;
  estimatedDuration: number;
  reputation: number;
  distance?: number;
  timestamp: number;
}

export interface Payment {
  id: string;
  from: string;
  to: string;
  amount: number;
  memo?: string;
  timestamp: number;
  proof?: string;
}

export interface Proof {
  id: string;
  taskId: string;
  deviceId: string;
  proofData: string;
  timestamp: number;
  verified: boolean;
}

export interface ReputationScore {
  deviceId: string;
  score: number;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageRating: number;
  lastUpdated: number;
}

export interface FleetConfig {
  fleetId: string;
  devices: string[];
  allowInternalMarket: boolean;
  allowTaskSwapping: boolean;
  allowResourceSharing: boolean;
  dynamicPricing: boolean;
}

export interface TaskDefinition {
  type: string;
  requiredCapabilities: string[];
  verificationRules: VerificationRules;
  pricing: PricingRules;
  description?: string;
}

export interface VerificationRules {
  requireProof: boolean;
  requireWitness: boolean;
  minReputation?: number;
  timeout?: number;
}

export interface PricingRules {
  basePrice: number;
  variableFactors: string[];
  minPrice?: number;
  maxPrice?: number;
}

export interface NetworkConfig {
  nodes: string[];
  bootstrapNodes?: string[];
  port?: number;
  encryption: boolean;
}

export interface TaskMetrics {
  taskId: string;
  duration: number;
  cost: number;
  efficiency: number;
  rating?: number;
}

export interface FleetMetrics {
  fleetId: string;
  efficiency: number;
  avgTaskTime: number;
  totalTasksCompleted: number;
  totalRevenue: number;
  avgDeviceUtilization: number;
  timestamp: number;
}

export type TaskFilter = {
  type?: string;
  minReward?: number;
  maxReward?: number;
  maxDistance?: number;
  minReputation?: number;
  priority?: TaskPriority;
  capabilities?: string[];
};

export type BidStrategy = 'competitive' | 'conservative' | 'aggressive' | 'auto';

export type EventCallback<T = any> = (data: T) => void | Promise<void>;
