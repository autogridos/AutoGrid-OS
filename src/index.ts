/**
 * AutoGrid OS 2.0 - Economic Operating System for Autonomous Devices
 * 
 * Main entry point for the library
 */

// Core
export { AutoGridOS } from './core/AutoGridOS';

// Core Modules
export { PaymentModule, PaymentChannel } from './modules/PaymentModule';
export { TaskVerificationModule } from './modules/TaskVerificationModule';
export { CoordinationLayer } from './modules/CoordinationLayer';
export { ReputationRegistry } from './modules/ReputationRegistry';
export { TaskMarketplace } from './modules/TaskMarketplace';
export { FleetManager } from './modules/FleetManager';

// v2.0 Modules - Swarm Intelligence
export { 
  SwarmIntelligence, 
  Swarm,
  SwarmAlgorithm,
  FormationType,
  SwarmState,
  type SwarmConfig,
  type SwarmObjective,
  type SwarmMember,
  type SwarmMetrics,
  type CoordinatedAction,
  type PheromoneTrail
} from './modules/SwarmIntelligence';

// v2.0 Modules - Insurance & Collateral
export { 
  InsuranceModule,
  InsuranceType,
  ClaimStatus,
  PoolStatus,
  type InsurancePolicy,
  type InsuranceClaim,
  type InsurancePool,
  type Collateral,
  type RiskAssessment,
  type InsuranceQuote
} from './modules/InsuranceModule';

// v2.0 Modules - Maintenance Prediction
export { 
  MaintenancePrediction,
  ComponentType,
  HealthStatus,
  MaintenanceType,
  MaintenanceStatus,
  type Component,
  type ComponentMetrics,
  type HealthReport,
  type FailurePrediction,
  type MaintenanceRecommendation,
  type MaintenanceTask,
  type HealthAlert,
  type SparePart
} from './modules/MaintenancePrediction';

// Adapters
export { WarehouseRobotAdapter } from './adapters/WarehouseRobotAdapter';
export { ServiceRobotAdapter } from './adapters/ServiceRobotAdapter';

// Utils
export * from './utils/helpers';

// Types
export * from './types';

// Version
export const VERSION = '2.0.0';
