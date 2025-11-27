# AutoGrid OS 2.0

**Economic Operating System for Autonomous Devices and Robots**

AutoGrid OS is an economic layer for robotics and autonomous systems, enabling devices to pay each other, distribute tasks, prove execution, maintain reputation, and self-organize into independent economic networks without centralized control.

## 🆕 What's New in v2.0

- **🐝 Swarm Intelligence** - Collective problem-solving with ant colony, particle swarm, and flocking algorithms
- **🛡️ Insurance & Collateral** - Task insurance pools, risk assessment, and automated claims
- **🔧 Predictive Maintenance** - Health monitoring, failure prediction, and automated repair scheduling

## Features

### Core Features (v1.0)
- 🤖 **Machine-to-Machine Payments** - Private transactions between devices
- ✅ **Task Verification** - Zero-knowledge proofs for task completion
- 🎯 **Autonomous Task Distribution** - Automatic optimal task assignment
- ⭐ **Reputation System** - Device performance tracking and scoring
- 💰 **Dynamic Pricing** - Market-driven task costs
- 🔄 **Fleet Optimization** - Internal resource sharing and coordination
- 🛡️ **Privacy-First** - All transactions and proofs are private by default

### Advanced Features (v2.0)

#### 🐝 Swarm Intelligence
- **Collective Problem Solving** - Coordinate multiple robots for complex tasks
- **Multiple Algorithms** - Ant Colony, Particle Swarm, Flocking, Bees, Consensus
- **Formation Control** - Line, Circle, Wedge, Grid, Surround, Convoy formations
- **Pheromone Trails** - Shared knowledge through virtual pheromones
- **Distributed Search** - Efficient area coverage and exploration

#### 🛡️ Insurance & Collateral
- **Task Insurance** - Protect against task failures with automated policies
- **Insurance Pools** - Fleet-level risk sharing and mutual insurance
- **Risk Assessment** - Automated risk scoring and premium calculation
- **Collateral Management** - Lock deposits for high-value tasks
- **Automated Claims** - Instant claim processing with proof verification

#### 🔧 Predictive Maintenance
- **Health Monitoring** - Real-time component health tracking
- **Failure Prediction** - ML-based failure probability estimation
- **Automated Scheduling** - Smart maintenance scheduling
- **Parts Inventory** - Spare parts tracking and auto-reorder
- **Service Marketplace** - Connect with repair robots/services

## Installation

```bash
npm install @autogrid/os
```

## Quick Start

```typescript
import { AutoGridOS, DeviceType } from '@autogrid/os';

const robot = new AutoGridOS({
  deviceId: 'warehouse-bot-001',
  deviceType: DeviceType.WAREHOUSE,
  privateKey: 'your-device-private-key',
  capabilities: ['transport', 'sorting', 'picking']
});

await robot.connect();

robot.onTaskAvailable((task) => {
  robot.submitBid(task.id, {
    price: 100,
    estimatedDuration: 300
  });
});
```

## v2.0 Modules

### 🐝 Swarm Intelligence

```typescript
import { SwarmIntelligence, SwarmAlgorithm, FormationType } from '@autogrid/os';

const swarm = new SwarmIntelligence({
  deviceId: 'robot-001',
  defaultAlgorithm: SwarmAlgorithm.ANT_COLONY
});

// Form a swarm for coordinated task
const cleanupSwarm = await swarm.formSwarm({
  taskId: 'large-cleanup',
  minDevices: 5,
  algorithm: SwarmAlgorithm.ANT_COLONY,
  objective: {
    type: 'coverage',
    successCriteria: { minCoverage: 95 }
  }
});

// Execute coordinated action
await cleanupSwarm.coordinatedAction('surround', targetLocation, {
  formation: FormationType.SURROUND,
  timing: 'synchronized'
});

// Share discoveries via pheromones
cleanupSwarm.depositPheromone(deviceId, path, 'success', 1.0);
```

### 🛡️ Insurance & Collateral

```typescript
import { InsuranceModule, InsuranceType } from '@autogrid/os';

const insurance = new InsuranceModule({ deviceId: 'robot-001' });

// Get quote and purchase policy
const quote = await insurance.getQuote({
  taskId: 'high-value-task',
  type: InsuranceType.COMPREHENSIVE,
  coverage: 10000
});

const policy = await insurance.insureTask('high-value-task', {
  coverage: 10000,
  quoteId: quote.id
});

// Lock collateral for task
const collateral = await insurance.lockCollateral({
  taskId: 'high-value-task',
  amount: 500,
  beneficiaryId: 'task-publisher'
});

// Join insurance pool
await insurance.joinPool('fleet-insurance-pool', 1000);
```

### 🔧 Predictive Maintenance

```typescript
import { MaintenancePrediction, ComponentType } from '@autogrid/os';

const maintenance = new MaintenancePrediction({
  deviceId: 'robot-001',
  alertThreshold: 0.7,
  autoSchedule: true
});

// Register and monitor components
const motor = maintenance.registerComponent({
  type: ComponentType.MOTOR,
  name: 'Drive Motor',
  expectedLifespan: 10000,
  maintenanceInterval: 500
});

maintenance.updateComponentMetrics(motor.id, {
  temperature: 65,
  vibration: 3.5,
  efficiency: 92
});

// Enable monitoring
maintenance.enableHealthMonitoring({
  reportInterval: 3600000,
  alertThreshold: 0.7
});

// Listen for predictions
maintenance.on('maintenance:predicted', (data) => {
  console.log(`Predicted: ${data.prediction.componentName}`);
  console.log(`Action: ${data.prediction.preventiveAction}`);
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AutoGrid OS 2.0                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Swarm     │  │  Insurance  │  │    Maintenance      │  │
│  │Intelligence │  │ & Collateral│  │    Prediction       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Payment   │  │    Task     │  │    Reputation       │  │
│  │   Module    │  │ Marketplace │  │    Registry         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Coordination │  │Verification │  │   Fleet Manager     │  │
│  │   Layer     │  │   Module    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Examples

- [Basic Usage](./examples/basic-usage.ts)
- [Service Robot](./examples/service-robot.ts)
- [Warehouse Fleet](./examples/warehouse-fleet.ts)
- [Advanced Features v2.0](./examples/advanced-features.ts) *(NEW)*

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Roadmap

- [x] Phase 1: Core OS Layer (payments, routing, verification)
- [x] Phase 2: Device Integrations (warehouse, medical, service robots)
- [x] Phase 3: Advanced Intelligence (swarm, insurance, maintenance)
- [ ] Phase 4: Full Autonomy (cross-fleet coordination, robot DAOs)
- [ ] Phase 5: Global Network (inter-city coordination, global insurance pools)
