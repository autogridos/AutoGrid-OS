# AutoGrid OS

**Economic Operating System for Autonomous Devices and Robots**

AutoGrid OS is an economic layer for robotics and autonomous systems, enabling devices to pay each other, distribute tasks, prove execution, maintain reputation, and self-organize into independent economic networks without centralized control.

## Features

- 🤖 **Machine-to-Machine Payments** - Private transactions between devices
- ✅ **Task Verification** - Zero-knowledge proofs for task completion
- 🎯 **Autonomous Task Distribution** - Automatic optimal task assignment
- ⭐ **Reputation System** - Device performance tracking and scoring
- 💰 **Dynamic Pricing** - Market-driven task costs
- 🔄 **Fleet Optimization** - Internal resource sharing and coordination
- 🛡️ **Privacy-First** - All transactions and proofs are private by default

## Installation

```bash
npm install @autogrid/os
```

## Quick Start

```typescript
import { AutoGridOS, DeviceType } from '@autogrid/os';

// Initialize AutoGrid OS for your device
const robot = new AutoGridOS({
  deviceId: 'warehouse-bot-001',
  deviceType: DeviceType.WAREHOUSE,
  privateKey: 'your-device-private-key',
  capabilities: ['transport', 'sorting', 'picking']
});

// Connect to the network
await robot.connect();

// Listen for available tasks
robot.onTaskAvailable((task) => {
  console.log('New task:', task);
  
  // Submit a bid
  robot.submitBid(task.id, {
    price: 100,
    estimatedDuration: 300 // seconds
  });
});

// Handle task assignment
robot.onTaskAssigned(async (task) => {
  console.log('Task assigned:', task);
  
  // Execute the task
  const result = await executeTask(task);
  
  // Submit proof of completion
  await robot.submitProof(task.id, result);
});
```

## Core Modules

### Payment Module

Handle private machine-to-machine transactions:

```typescript
import { PaymentModule } from '@autogrid/os';

const payment = new PaymentModule({
  deviceId: 'robot-001',
  privateKey: 'key'
});

// Send payment to another device
await payment.send({
  to: 'robot-002',
  amount: 500,
  memo: 'Task completion payment'
});

// Check balance
const balance = await payment.getBalance();
```

### Task Verification Module

Generate and verify zero-knowledge proofs:

```typescript
import { TaskVerificationModule } from '@autogrid/os';

const verification = new TaskVerificationModule();

// Generate proof of task completion
const proof = await verification.generateProof({
  taskId: 'task-123',
  result: taskResult,
  parameters: taskParams
});

// Verify proof
const isValid = await verification.verifyProof(proof);
```

### Coordination Layer

Manage task requests and routing:

```typescript
import { CoordinationLayer } from '@autogrid/os';

const coordinator = new CoordinationLayer({
  deviceId: 'robot-001'
});

// Publish a new task
await coordinator.publishTask({
  type: 'transport',
  payload: { from: 'A1', to: 'B5' },
  maxPrice: 1000,
  deadline: Date.now() + 3600000
});

// Subscribe to task updates
coordinator.onTaskUpdate((update) => {
  console.log('Task status:', update);
});
```

### Reputation Registry

Track and query device reputation:

```typescript
import { ReputationRegistry } from '@autogrid/os';

const reputation = new ReputationRegistry();

// Get device reputation
const score = await reputation.getScore('robot-001');

// Update reputation after task completion
await reputation.recordCompletion({
  deviceId: 'robot-001',
  taskId: 'task-123',
  success: true,
  rating: 5
});
```

### Task Marketplace

Decentralized task bidding and assignment:

```typescript
import { TaskMarketplace } from '@autogrid/os';

const marketplace = new TaskMarketplace({
  deviceId: 'robot-001'
});

// Browse available tasks
const tasks = await marketplace.getAvailableTasks({
  type: 'warehouse',
  maxDistance: 100,
  minReputation: 4.0
});

// Submit bid with automated optimization
await marketplace.submitBid(taskId, {
  price: 'auto', // Automatically calculate optimal price
  priority: 'high'
});
```

## Use Cases

### Warehouse Automation

```typescript
const warehouseBot = new AutoGridOS({
  deviceId: 'warehouse-bot-001',
  deviceType: DeviceType.WAREHOUSE,
  capabilities: ['transport', 'sorting', 'picking'],
  location: { x: 10, y: 20, floor: 1 }
});

// Fleet automatically redistributes tasks based on:
// - Distance to task location
// - Current load
// - Battery level
// - Reputation score
```

### Hospital Robotics

```typescript
const medicalBot = new AutoGridOS({
  deviceId: 'medical-bot-001',
  deviceType: DeviceType.MEDICAL,
  capabilities: ['sterilization', 'transport', 'assistance']
});

// Critical tasks get prioritized
// Robots can pay each other for urgent task swapping
```

### Smart City Services

```typescript
const cleaningDrone = new AutoGridOS({
  deviceId: 'drone-001',
  deviceType: DeviceType.CLEANING,
  capabilities: ['cleaning', 'monitoring']
});

// Autonomous territory division
// 24/7 operation without dispatcher
```

## Advanced Configuration

### Fleet Management

```typescript
import { FleetManager } from '@autogrid/os';

const fleet = new FleetManager({
  fleetId: 'warehouse-fleet-alpha',
  devices: ['robot-001', 'robot-002', 'robot-003']
});

// Enable internal optimization
fleet.enableInternalMarket({
  allowTaskSwapping: true,
  allowResourceSharing: true,
  dynamicPricing: true
});

// Monitor fleet performance
fleet.onMetrics((metrics) => {
  console.log('Fleet efficiency:', metrics.efficiency);
  console.log('Average task time:', metrics.avgTaskTime);
});
```

### Custom Task Types

```typescript
import { TaskDefinition } from '@autogrid/os';

const customTask: TaskDefinition = {
  type: 'custom-assembly',
  requiredCapabilities: ['precision-grip', 'vision-system'],
  verificationRules: {
    requireProof: true,
    requireWitness: false,
    minReputation: 4.5
  },
  pricing: {
    basePrice: 1000,
    variableFactors: ['complexity', 'urgency']
  }
};

robot.registerTaskType(customTask);
```

## API Reference

See [API Documentation](./docs/API.md) for complete reference.

## Architecture

AutoGrid OS consists of modular components:

1. **Payment Layer** - Private transaction handling
2. **Verification Layer** - Zero-knowledge proof generation and validation
3. **Coordination Layer** - Task routing and state management
4. **Reputation Layer** - Performance tracking and scoring
5. **Market Layer** - Task bidding and automatic assignment
6. **DevKit** - Integration tools and adapters

## Security

- All payments are private by default
- Task proofs use zero-knowledge cryptography
- Device identity is verified through cryptographic signatures
- Network communication is encrypted end-to-end

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- Documentation: https://docs.autogrid.io
- Discord: https://discord.gg/autogrid
- Issues: https://github.com/autogrid/autogrid-os/issues

## Roadmap

- [x] Phase 1: Core OS Layer (payments, routing, verification)
- [x] Phase 2: Device Integrations (warehouse, medical, service robots)
- [ ] Phase 3: Fleet Economy (auctions, reputation, dynamic pricing)
- [ ] Phase 4: Full Autonomy (cross-fleet coordination, robot DAOs)