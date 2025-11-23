# AutoGrid OS - API Documentation

Complete API reference for AutoGrid OS v1.0.0

## Table of Contents

- [Core Classes](#core-classes)
  - [AutoGridOS](#autogrid-os)
- [Modules](#modules)
  - [PaymentModule](#paymentmodule)
  - [TaskVerificationModule](#taskverificationmodule)
  - [CoordinationLayer](#coordinationlayer)
  - [ReputationRegistry](#reputationregistry)
  - [TaskMarketplace](#taskmarketplace)
  - [FleetManager](#fleetmanager)
- [Types](#types)
- [Adapters](#adapters)

---

## Core Classes

### AutoGridOS

Main operating system class that coordinates all modules.

#### Constructor

```typescript
new AutoGridOS(config: DeviceConfig)
```

**Parameters:**
- `config.deviceId` (string) - Unique device identifier
- `config.deviceType` (DeviceType) - Type of device
- `config.privateKey` (string) - Private key for signing
- `config.capabilities` (string[]) - Device capabilities
- `config.location?` (Location) - Initial location
- `config.metadata?` (Record<string, any>) - Additional metadata

**Example:**
```typescript
const robot = new AutoGridOS({
  deviceId: 'warehouse-bot-001',
  deviceType: DeviceType.WAREHOUSE,
  privateKey: 'secret-key',
  capabilities: ['transport', 'sorting'],
  location: { x: 10, y: 20, floor: 1 }
});
```

#### Methods

##### connect()

Connect to the AutoGrid network.

```typescript
async connect(): Promise<void>
```

**Example:**
```typescript
await robot.connect();
```

##### disconnect()

Disconnect from the network.

```typescript
async disconnect(): Promise<void>
```

##### publishTask()

Publish a new task to the network.

```typescript
async publishTask(params: {
  type: string;
  payload: Record<string, any>;
  maxPrice: number;
  deadline?: number;
}): Promise<Task>
```

**Parameters:**
- `type` - Task type (e.g., 'transport', 'cleaning')
- `payload` - Task-specific data
- `maxPrice` - Maximum reward for task
- `deadline?` - Optional deadline timestamp

**Returns:** Created task object

**Example:**
```typescript
const task = await robot.publishTask({
  type: 'transport',
  payload: { from: 'A1', to: 'B5', weight: 10 },
  maxPrice: 500,
  deadline: Date.now() + 3600000
});
```

##### submitBid()

Submit a bid for a task.

```typescript
async submitBid(
  taskId: string,
  params: {
    price: number | 'auto';
    estimatedDuration: number;
  }
): Promise<Bid>
```

**Parameters:**
- `taskId` - ID of task to bid on
- `price` - Bid amount or 'auto' for automatic pricing
- `estimatedDuration` - Estimated completion time in seconds

**Returns:** Created bid object

**Example:**
```typescript
const bid = await robot.submitBid('task-123', {
  price: 'auto',
  estimatedDuration: 300
});
```

##### submitProof()

Submit proof of task completion.

```typescript
async submitProof(taskId: string, result: any): Promise<Proof>
```

**Parameters:**
- `taskId` - ID of completed task
- `result` - Task result data

**Returns:** Generated proof

**Example:**
```typescript
const proof = await robot.submitProof('task-123', {
  completed: true,
  timestamp: Date.now(),
  location: { x: 50, y: 30 }
});
```

##### sendPayment()

Send payment to another device.

```typescript
async sendPayment(params: {
  to: string;
  amount: number;
  memo?: string;
}): Promise<Payment>
```

**Example:**
```typescript
const payment = await robot.sendPayment({
  to: 'robot-002',
  amount: 100,
  memo: 'Task completion payment'
});
```

##### getBalance()

Get current token balance.

```typescript
getBalance(): number
```

**Returns:** Current balance

##### getReputation()

Get device reputation score.

```typescript
async getReputation(): Promise<number>
```

**Returns:** Reputation score (0-5)

##### getActiveTasks()

Get list of active tasks.

```typescript
getActiveTasks(): Task[]
```

**Returns:** Array of active tasks

##### getPaymentHistory()

Get payment history.

```typescript
getPaymentHistory(limit?: number): Payment[]
```

**Parameters:**
- `limit?` - Optional limit on number of payments

**Returns:** Array of payments

##### updateLocation()

Update device location.

```typescript
updateLocation(location: Location): void
```

**Parameters:**
- `location` - New location coordinates

##### getLocation()

Get current location.

```typescript
getLocation(): Location | undefined
```

##### getConfig()

Get device configuration.

```typescript
getConfig(): DeviceConfig
```

##### getMarketStats()

Get marketplace statistics.

```typescript
getMarketStats(): {
  totalTasks: number;
  averageReward: number;
  activeBids: number;
  wonTasks: number;
  tasksByPriority: Record<string, number>;
}
```

##### registerTaskType()

Register custom task type.

```typescript
registerTaskType(definition: TaskDefinition): void
```

**Example:**
```typescript
robot.registerTaskType({
  type: 'custom-assembly',
  requiredCapabilities: ['precision-grip'],
  verificationRules: {
    requireProof: true,
    requireWitness: false,
    minReputation: 4.0
  },
  pricing: {
    basePrice: 1000,
    variableFactors: ['complexity']
  }
});
```

#### Event Handlers

##### onTaskAvailable()

Listen for available tasks.

```typescript
onTaskAvailable(callback: (task: Task) => void): void
```

**Example:**
```typescript
robot.onTaskAvailable((task) => {
  console.log('New task:', task.type);
});
```

##### onTaskAssigned()

Listen for task assignments.

```typescript
onTaskAssigned(callback: (task: Task) => void): void
```

**Example:**
```typescript
robot.onTaskAssigned(async (task) => {
  await executeTask(task);
  await robot.submitProof(task.id, result);
});
```

#### Events

The AutoGridOS class emits the following events:

- `connecting` - Connection initiated
- `connected` - Successfully connected
- `disconnecting` - Disconnection initiated
- `disconnected` - Successfully disconnected
- `payment:received` - Payment received
- `task:won` - Won a task bid
- `task:updated` - Task status updated
- `reputation:updated` - Reputation score updated
- `proof:submitted` - Proof submitted
- `network:registered` - Registered on network

**Example:**
```typescript
robot.on('payment:received', (payment) => {
  console.log('Received:', payment.amount);
});
```

---

## Modules

### PaymentModule

Handles private machine-to-machine payments.

#### Constructor

```typescript
new PaymentModule(config: {
  deviceId: string;
  privateKey: string;
  initialBalance?: number;
})
```

#### Methods

##### send()

Send payment to another device.

```typescript
async send(params: {
  to: string;
  amount: number;
  memo?: string;
}): Promise<Payment>
```

##### receive()

Receive and verify payment.

```typescript
async receive(payment: Payment): Promise<void>
```

##### openChannel()

Open payment channel for high-frequency transactions.

```typescript
async openChannel(params: {
  counterparty: string;
  initialDeposit: number;
  duration?: number;
}): Promise<PaymentChannel>
```

##### closeChannel()

Close payment channel and settle.

```typescript
async closeChannel(channelId: string): Promise<void>
```

##### getBalance()

Get current balance.

```typescript
getBalance(): number
```

##### getHistory()

Get payment history.

```typescript
getHistory(limit?: number): Payment[]
```

##### addFunds()

Add funds to balance (for testing).

```typescript
addFunds(amount: number): void
```

---

### TaskVerificationModule

Generates and verifies zero-knowledge proofs.

#### Constructor

```typescript
new TaskVerificationModule(config?: {
  deviceId?: string;
  zkEnabled?: boolean;
})
```

#### Methods

##### generateProof()

Generate proof of task completion.

```typescript
async generateProof(params: {
  taskId: string;
  result: any;
  parameters: Record<string, any>;
  deviceId?: string;
}): Promise<Proof>
```

##### verifyProof()

Verify a proof.

```typescript
async verifyProof(proof: Proof): Promise<boolean>
```

##### generateExecutionProof()

Generate detailed execution trace proof.

```typescript
async generateExecutionProof(params: {
  taskId: string;
  steps: Array<{ step: string; result: any; timestamp: number }>;
  finalResult: any;
}): Promise<string>
```

##### verifyExecutionProof()

Verify execution trace proof.

```typescript
async verifyExecutionProof(proofData: string): Promise<boolean>
```

##### getProof()

Get cached proof by ID.

```typescript
getProof(proofId: string): Proof | undefined
```

##### clearCache()

Clear proof cache.

```typescript
clearCache(): void
```

---

### CoordinationLayer

Manages tasks and device coordination.

#### Constructor

```typescript
new CoordinationLayer(config: {
  deviceId: string;
  location?: Location;
  capabilities?: string[];
})
```

#### Methods

##### publishTask()

Publish a new task.

```typescript
async publishTask(params: {
  type: string;
  payload: Record<string, any>;
  maxPrice?: number;
  deadline?: number;
  priority?: TaskPriority;
  requirements?: {
    capabilities: string[];
    minReputation?: number;
    maxDistance?: number;
  };
}): Promise<Task>
```

##### updateTaskStatus()

Update task status.

```typescript
async updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  metadata?: Record<string, any>
): Promise<void>
```

##### assignTask()

Assign task to device.

```typescript
async assignTask(taskId: string, deviceId: string): Promise<void>
```

##### createRoute()

Create route for task execution.

```typescript
async createRoute(params: {
  taskId: string;
  waypoints: Location[];
  estimatedDuration: number;
  priority: TaskPriority;
}): Promise<Route>
```

##### updateRoute()

Update route progress.

```typescript
async updateRoute(routeId: string, waypointIndex: number): Promise<void>
```

##### getActiveTasks()

Get all active tasks.

```typescript
getActiveTasks(): Task[]
```

##### getTask()

Get task by ID.

```typescript
getTask(taskId: string): Task | undefined
```

##### getTasksByStatus()

Get tasks by status.

```typescript
getTasksByStatus(status: TaskStatus): Task[]
```

##### cancelTask()

Cancel a task.

```typescript
async cancelTask(taskId: string, reason?: string): Promise<void>
```

##### canExecuteTask()

Check if device can execute task.

```typescript
canExecuteTask(task: Task): boolean
```

##### queueTask()

Add task to queue.

```typescript
queueTask(task: Task): void
```

##### getNextQueuedTask()

Get next task from queue.

```typescript
getNextQueuedTask(): Task | undefined
```

##### updateLocation()

Update device location.

```typescript
updateLocation(location: Location): void
```

##### getLocation()

Get current location.

```typescript
getLocation(): Location | undefined
```

##### addCapability()

Add capability to device.

```typescript
addCapability(capability: string): void
```

##### removeCapability()

Remove capability from device.

```typescript
removeCapability(capability: string): void
```

##### getCapabilities()

Get device capabilities.

```typescript
getCapabilities(): string[]
```

---

### ReputationRegistry

Tracks and manages device reputation.

#### Constructor

```typescript
new ReputationRegistry(config?: {
  initialScore?: number;
  decayRate?: number;
  minScore?: number;
  maxScore?: number;
})
```

#### Methods

##### getScore()

Get reputation score for device.

```typescript
async getScore(deviceId: string): Promise<ReputationScore>
```

##### recordCompletion()

Record task completion.

```typescript
async recordCompletion(params: {
  deviceId: string;
  taskId: string;
  success: boolean;
  rating?: number;
  duration?: number;
  onTime?: boolean;
}): Promise<void>
```

##### recordFailure()

Record task failure.

```typescript
async recordFailure(params: {
  deviceId: string;
  taskId: string;
  reason?: string;
}): Promise<void>
```

##### getTopRated()

Get top rated devices.

```typescript
async getTopRated(limit?: number): Promise<ReputationScore[]>
```

##### getDevicesByMinScore()

Get devices above minimum score.

```typescript
async getDevicesByMinScore(minScore: number): Promise<ReputationScore[]>
```

##### applyDecay()

Apply reputation decay over time.

```typescript
async applyDecay(): Promise<void>
```

##### getHistory()

Get task completion history.

```typescript
getHistory(deviceId: string, limit?: number): TaskCompletion[]
```

##### getSuccessRate()

Get success rate for device.

```typescript
getSuccessRate(deviceId: string): number
```

##### resetScore()

Reset device score.

```typescript
async resetScore(deviceId: string): Promise<void>
```

##### exportData()

Export reputation data.

```typescript
exportData(): {
  scores: ReputationScore[];
  completions: Record<string, TaskCompletion[]>;
}
```

##### importData()

Import reputation data.

```typescript
importData(data: {
  scores: ReputationScore[];
  completions: Record<string, TaskCompletion[]>;
}): void
```

---

### TaskMarketplace

Manages task bidding and assignment.

#### Constructor

```typescript
new TaskMarketplace(config: {
  deviceId: string;
  location?: Location;
  reputation?: number;
  capabilities?: string[];
})
```

#### Methods

##### getAvailableTasks()

Get available tasks with optional filtering.

```typescript
async getAvailableTasks(filter?: TaskFilter): Promise<Task[]>
```

**Filter options:**
- `type?` - Task type
- `minReward?` - Minimum reward
- `maxReward?` - Maximum reward
- `maxDistance?` - Maximum distance
- `minReputation?` - Minimum reputation required
- `priority?` - Task priority
- `capabilities?` - Required capabilities

##### submitBid()

Submit bid for task.

```typescript
async submitBid(
  taskId: string,
  params: {
    price: number | 'auto';
    estimatedDuration: number;
    strategy?: BidStrategy;
  }
): Promise<Bid>
```

**Bid strategies:**
- `'auto'` - Automatic optimal pricing
- `'aggressive'` - Lower price to win
- `'conservative'` - Higher price for safety
- `'competitive'` - Market-based pricing

##### withdrawBid()

Withdraw a bid.

```typescript
async withdrawBid(bidId: string): Promise<void>
```

##### handleBidWon()

Handle winning a bid.

```typescript
async handleBidWon(taskId: string): Promise<void>
```

##### addTask()

Add task to marketplace.

```typescript
addTask(task: Task): void
```

##### removeTask()

Remove task from marketplace.

```typescript
removeTask(taskId: string): void
```

##### getActiveBids()

Get active bids.

```typescript
getActiveBids(): Bid[]
```

##### getWonTasks()

Get won tasks.

```typescript
getWonTasks(): Task[]
```

##### updateReputation()

Update device reputation.

```typescript
updateReputation(score: number): void
```

##### updateLocation()

Update device location.

```typescript
updateLocation(location: Location): void
```

##### getMarketStats()

Get market statistics.

```typescript
getMarketStats(): {
  totalTasks: number;
  averageReward: number;
  activeBids: number;
  wonTasks: number;
  tasksByPriority: Record<string, number>;
}
```

---

### FleetManager

Manages multiple devices as a fleet.

#### Constructor

```typescript
new FleetManager(config: FleetConfig)
```

**Config:**
- `fleetId` - Fleet identifier
- `devices` - Array of device IDs
- `allowInternalMarket` - Enable internal trading
- `allowTaskSwapping` - Enable task swapping
- `allowResourceSharing` - Enable resource sharing
- `dynamicPricing` - Enable dynamic pricing

#### Methods

##### enableInternalMarket()

Enable internal market features.

```typescript
enableInternalMarket(options: {
  allowTaskSwapping?: boolean;
  allowResourceSharing?: boolean;
  dynamicPricing?: boolean;
}): void
```

##### optimizeDistribution()

Optimize task distribution across fleet.

```typescript
async optimizeDistribution(tasks: Task[]): Promise<Map<string, Task[]>>
```

##### requestTaskSwap()

Request task swap between devices.

```typescript
async requestTaskSwap(params: {
  fromDeviceId: string;
  toDeviceId: string;
  taskId: string;
  payment: number;
}): Promise<boolean>
```

##### shareResource()

Share resource between devices.

```typescript
async shareResource(params: {
  fromDeviceId: string;
  toDeviceId: string;
  resourceType: string;
  amount: number;
  payment: number;
}): Promise<boolean>
```

##### recordCompletion()

Record task completion for device.

```typescript
recordCompletion(deviceId: string, task: Task, revenue: number): void
```

##### getMetrics()

Get fleet metrics.

```typescript
getMetrics(): FleetMetrics
```

##### getDeviceInfo()

Get device information.

```typescript
getDeviceInfo(deviceId: string): DeviceInfo | undefined
```

##### getAllDevices()

Get all devices in fleet.

```typescript
getAllDevices(): DeviceInfo[]
```

##### addDevice()

Add device to fleet.

```typescript
addDevice(deviceId: string): void
```

##### removeDevice()

Remove device from fleet.

```typescript
removeDevice(deviceId: string): void
```

##### getEfficiencyScore()

Get fleet efficiency score.

```typescript
getEfficiencyScore(): number
```

---

## Types

### DeviceType

```typescript
enum DeviceType {
  WAREHOUSE = 'warehouse',
  MEDICAL = 'medical',
  MANUFACTURING = 'manufacturing',
  CLEANING = 'cleaning',
  TRANSPORT = 'transport',
  SERVICE = 'service',
  CUSTOM = 'custom'
}
```

### TaskStatus

```typescript
enum TaskStatus {
  PENDING = 'pending',
  BIDDING = 'bidding',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### TaskPriority

```typescript
enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Location

```typescript
interface Location {
  x: number;
  y: number;
  z?: number;
  floor?: number;
  area?: string;
}
```

### Task

```typescript
interface Task {
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
```

### Bid

```typescript
interface Bid {
  id: string;
  taskId: string;
  deviceId: string;
  price: number;
  estimatedDuration: number;
  reputation: number;
  distance?: number;
  timestamp: number;
}
```

### Payment

```typescript
interface Payment {
  id: string;
  from: string;
  to: string;
  amount: number;
  memo?: string;
  timestamp: number;
  proof?: string;
}
```

### Proof

```typescript
interface Proof {
  id: string;
  taskId: string;
  deviceId: string;
  proofData: string;
  timestamp: number;
  verified: boolean;
}
```

### ReputationScore

```typescript
interface ReputationScore {
  deviceId: string;
  score: number;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageRating: number;
  lastUpdated: number;
}
```

---

## Adapters

### WarehouseRobotAdapter

Pre-built adapter for warehouse automation systems.

#### Constructor

```typescript
new WarehouseRobotAdapter(config: {
  deviceId: string;
  privateKey: string;
  warehouseId: string;
  capabilities: WarehouseCapability[];
  initialLocation?: { x: number; y: number; floor: number };
  maxLoad?: number;
  batteryCapacity?: number;
})
```

#### Capabilities

- `'transport'` - Move items
- `'picking'` - Pick items
- `'sorting'` - Sort items
- `'packing'` - Pack items
- `'inventory'` - Inventory management
- `'heavy-lift'` - Heavy lifting
- `'precision-handling'` - Precision handling

#### Methods

##### start()

Start the warehouse robot.

```typescript
async start(): Promise<void>
```

##### stop()

Stop the warehouse robot.

```typescript
async stop(): Promise<void>
```

##### executeTransport()

Execute transport task.

```typescript
async executeTransport(task: Task): Promise<void>
```

##### executePicking()

Execute picking task.

```typescript
async executePicking(task: Task): Promise<void>
```

##### executeSorting()

Execute sorting task.

```typescript
async executeSorting(task: Task): Promise<void>
```

##### requestCharging()

Request charging at station.

```typescript
async requestCharging(): Promise<void>
```

##### getStatus()

Get robot status.

```typescript
getStatus(): {
  deviceId: string;
  location: Location;
  currentLoad: number;
  maxLoad: number;
  batteryLevel: number;
  isCharging: boolean;
  balance: number;
  activeTasks: number;
}
```

#### Events

- `robot:started` - Robot started
- `robot:stopped` - Robot stopped
- `transport:started` - Transport started
- `transport:pickup` - Item picked up
- `transport:delivery` - Item delivered
- `transport:completed` - Transport completed
- `picking:started` - Picking started
- `picking:item-picked` - Item picked
- `picking:completed` - Picking completed
- `sorting:started` - Sorting started
- `sorting:completed` - Sorting completed
- `charging:requested` - Charging requested
- `charging:started` - Charging started
- `charging:progress` - Charging progress
- `charging:completed` - Charging completed
- `navigation:started` - Navigation started
- `navigation:completed` - Navigation completed
- `task:assigned` - Task assigned
- `task:completed` - Task completed
- `task:failed` - Task failed
- `payment:received` - Payment received
- `reputation:updated` - Reputation updated

---

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  await robot.connect();
  const task = await robot.publishTask({...});
} catch (error) {
  console.error('Error:', error.message);
}
```

Common errors:
- `'Not connected to network'` - Call connect() first
- `'Insufficient balance'` - Add funds or earn more
- `'Task not found'` - Invalid task ID
- `'Invalid payment proof'` - Payment verification failed
- `'Device ID is required'` - Missing device ID

---

## Best Practices

### 1. Always Connect First

```typescript
await robot.connect();
```

### 2. Handle Events

```typescript
robot.onTaskAvailable((task) => {
  // Handle task
});
```

### 3. Use Auto Pricing

```typescript
robot.submitBid(taskId, {
  price: 'auto',
  estimatedDuration: 300
});
```

### 4. Submit Proofs

```typescript
const result = await executeTask(task);
await robot.submitProof(task.id, result);
```

### 5. Monitor Balance

```typescript
const balance = robot.getBalance();
if (balance < 100) {
  // Request more funds
}
```

---

## Version

API Version: 1.0.0
Last Updated: November 2025