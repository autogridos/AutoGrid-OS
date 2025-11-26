/**
 * AutoGrid OS - Economic Operating System for Autonomous Devices
 * 
 * Main entry point for the library
 */

// Core
export { AutoGridOS } from './core/AutoGridOS';

// Modules
export { PaymentModule, PaymentChannel } from './modules/PaymentModule';
export { TaskVerificationModule } from './modules/TaskVerificationModule';
export { CoordinationLayer } from './modules/CoordinationLayer';
export { ReputationRegistry } from './modules/ReputationRegistry';
export { TaskMarketplace } from './modules/TaskMarketplace';
export { FleetManager } from './modules/FleetManager';

// Adapters
export { WarehouseRobotAdapter } from './adapters/WarehouseRobotAdapter';
export { ServiceRobotAdapter } from './adapters/ServiceRobotAdapter';

// Utils
export * from './utils/helpers';

// Types
export * from './types';

// Version
export const VERSION = '1.0.0';
