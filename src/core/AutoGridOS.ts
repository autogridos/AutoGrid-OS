/**
 * AutoGrid OS - Economic Operating System for Autonomous Devices
 * 
 * Main SDK class that integrates all modules and provides
 * unified interface for autonomous device operations.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
  DeviceConfig,
  DeviceType,
  Task,
  TaskStatus,
  TaskPriority,
  TaskDefinition,
  TaskFilter,
  Bid,
  Payment,
  Location,
  ReputationScore,
  Proof,
  BidStrategy,
  EventCallback
} from '../types';
import { PaymentModule } from '../modules/PaymentModule';
import { TaskVerificationModule } from '../modules/TaskVerificationModule';
import { CoordinationLayer } from '../modules/CoordinationLayer';
import { TaskMarketplace } from '../modules/TaskMarketplace';
import { ReputationRegistry } from '../modules/ReputationRegistry';

export interface AutoGridOSConfig extends DeviceConfig {
  initialBalance?: number;
  autoConnect?: boolean;
  zkProofs?: boolean;
}

export class AutoGridOS extends EventEmitter {
  private config: AutoGridOSConfig;
  private connected: boolean = false;
  private location?: Location;
  
  // Core modules
  private payments: PaymentModule;
  private verification: TaskVerificationModule;
  private coordination: CoordinationLayer;
  private marketplace: TaskMarketplace;
  private reputation: ReputationRegistry;
  
  // Task definitions
  private taskDefinitions: Map<string, TaskDefinition> = new Map();
  
  // Event handlers
  private taskHandlers: Map<string, EventCallback<Task>> = new Map();

  constructor(config: AutoGridOSConfig) {
    super();
    this.config = config;
    this.location = config.location;

    // Initialize payment module
    this.payments = new PaymentModule({
      deviceId: config.deviceId,
      privateKey: config.privateKey,
      initialBalance: config.initialBalance ?? 1000
    });

    // Initialize verification module
    this.verification = new TaskVerificationModule({
      deviceId: config.deviceId,
      zkEnabled: config.zkProofs ?? true
    });

    // Initialize coordination layer
    this.coordination = new CoordinationLayer({
      deviceId: config.deviceId,
      location: config.location,
      capabilities: config.capabilities
    });

    // Initialize marketplace
    this.marketplace = new TaskMarketplace({
      deviceId: config.deviceId,
      location: config.location,
      capabilities: config.capabilities
    });

    // Initialize reputation registry
    this.reputation = new ReputationRegistry({
      deviceId: config.deviceId
    });

    // Wire up internal events
    this.setupInternalEvents();

    // Register default task types
    this.registerDefaultTaskTypes();
  }

  // ==================== Connection Management ====================

  /**
   * Connect to the AutoGrid network
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    // Simulate network connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.connected = true;
    this.emit('connected', { deviceId: this.config.deviceId });
  }

  /**
   * Disconnect from the AutoGrid network
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.connected = false;
    this.emit('disconnected', { deviceId: this.config.deviceId });
  }

  /**
   * Check if connected to network
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ==================== Task Management ====================

  /**
   * Publish a new task to the marketplace
   */
  async publishTask(params: {
    type: string;
    payload: Record<string, any>;
    maxPrice?: number;
    deadline?: number;
    priority?: TaskPriority;
    requirements?: {
      capabilities?: string[];
      minReputation?: number;
      maxDistance?: number;
    };
  }): Promise<Task> {
    this.ensureConnected();

    const task = await this.coordination.publishTask({
      type: params.type,
      payload: params.payload,
      maxPrice: params.maxPrice,
      deadline: params.deadline,
      priority: params.priority,
      requirements: {
        capabilities: params.requirements?.capabilities || [],
        minReputation: params.requirements?.minReputation,
        maxDistance: params.requirements?.maxDistance
      }
    });

    // Add to marketplace
    this.marketplace.addTask(task);

    this.emit('task:published', task);
    return task;
  }

  /**
   * Submit a bid for a task
   */
  async submitBid(
    taskId: string,
    params: {
      price: number | 'auto';
      estimatedDuration: number;
      strategy?: BidStrategy;
    }
  ): Promise<Bid> {
    this.ensureConnected();

    const bid = await this.marketplace.submitBid(taskId, params);
    this.emit('bid:submitted', bid);
    return bid;
  }

  /**
   * Get available tasks from marketplace
   */
  async getAvailableTasks(filter?: TaskFilter): Promise<Task[]> {
    return this.marketplace.getAvailableTasks(filter);
  }

  /**
   * Get active tasks assigned to this device
   */
  getActiveTasks(): Task[] {
    return this.coordination.getActiveTasks();
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.coordination.updateTaskStatus(taskId, status, metadata);
    this.emit('task:updated', { taskId, status, metadata });
  }

  /**
   * Register a custom task type
   */
  registerTaskType(definition: TaskDefinition): void {
    this.taskDefinitions.set(definition.type, definition);
    this.emit('taskType:registered', definition);
  }

  /**
   * Handle task assignment events
   */
  onTaskAssigned(callback: EventCallback<Task>): void {
    this.taskHandlers.set('assigned', callback);
    this.on('task:assigned', callback);
  }

  // ==================== Payment Management ====================

  /**
   * Send payment to another device
   */
  async sendPayment(params: {
    to: string;
    amount: number;
    memo?: string;
  }): Promise<Payment> {
    this.ensureConnected();

    const payment = await this.payments.send(params);
    this.emit('payment:sent', payment);
    return payment;
  }

  /**
   * Receive a payment
   */
  async receivePayment(payment: Payment): Promise<void> {
    await this.payments.receive(payment);
    this.emit('payment:received', payment);
  }

  /**
   * Get current balance
   */
  getBalance(): number {
    return this.payments.getBalance();
  }

  /**
   * Get payment history
   */
  getPaymentHistory(limit?: number): Payment[] {
    return this.payments.getHistory(limit);
  }

  /**
   * Add funds to balance
   */
  addFunds(amount: number): void {
    this.payments.addFunds(amount);
  }

  // ==================== Verification & Proofs ====================

  /**
   * Submit proof of task completion
   */
  async submitProof(taskId: string, result: any): Promise<Proof> {
    const task = this.coordination.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const proof = await this.verification.generateProof({
      taskId,
      result,
      parameters: task.payload
    });

    // Update task status
    await this.updateTaskStatus(taskId, TaskStatus.COMPLETED, { proofId: proof.id });

    this.emit('proof:submitted', proof);
    return proof;
  }

  /**
   * Verify a proof
   */
  async verifyProof(proof: Proof): Promise<boolean> {
    return this.verification.verifyProof(proof);
  }

  // ==================== Reputation ====================

  /**
   * Get current reputation score
   */
  async getReputation(): Promise<number> {
    const score = await this.reputation.getScore(this.config.deviceId);
    return score?.score ?? 3.0;
  }

  /**
   * Get full reputation details
   */
  async getReputationDetails(): Promise<ReputationScore | null> {
    return this.reputation.getScore(this.config.deviceId);
  }

  /**
   * Rate another device
   */
  async rateDevice(deviceId: string, rating: number, taskId?: string): Promise<void> {
    await this.reputation.addRating({
      fromDeviceId: this.config.deviceId,
      toDeviceId: deviceId,
      rating,
      taskId
    });
  }

  // ==================== Location & Configuration ====================

  /**
   * Update device location
   */
  updateLocation(location: Location): void {
    this.location = location;
    this.coordination.updateLocation(location);
    this.marketplace.updateLocation(location);
    this.emit('location:updated', location);
  }

  /**
   * Get current location
   */
  getLocation(): Location | undefined {
    return this.location;
  }

  /**
   * Get device configuration
   */
  getConfig(): AutoGridOSConfig {
    return { ...this.config };
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.config.deviceId;
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): string[] {
    return [...this.config.capabilities];
  }

  /**
   * Add a capability
   */
  addCapability(capability: string): void {
    if (!this.config.capabilities.includes(capability)) {
      this.config.capabilities.push(capability);
      this.coordination.addCapability(capability);
      this.emit('capability:added', capability);
    }
  }

  // ==================== Marketplace Statistics ====================

  /**
   * Get market statistics
   */
  getMarketStats() {
    return this.marketplace.getMarketStats();
  }

  /**
   * Get active bids
   */
  getActiveBids(): Bid[] {
    return this.marketplace.getActiveBids();
  }

  /**
   * Get won tasks
   */
  getWonTasks(): Task[] {
    return this.marketplace.getWonTasks();
  }

  // ==================== Private Methods ====================

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to AutoGrid network');
    }
  }

  private setupInternalEvents(): void {
    // Forward payment events
    this.payments.on('payment:sent', (payment) => {
      this.emit('payment:sent', payment);
    });

    this.payments.on('payment:received', (payment) => {
      this.emit('payment:received', payment);
    });

    // Forward marketplace events
    this.marketplace.on('bid:won', async (task) => {
      this.emit('task:assigned', task);
      
      // Execute registered handler
      const handler = this.taskHandlers.get('assigned');
      if (handler) {
        await handler(task);
      }
    });

    this.marketplace.on('task:available', (task) => {
      this.emit('task:available', task);
    });

    // Forward coordination events
    this.coordination.on('task:updated', (data) => {
      this.emit('task:updated', data);
    });

    this.coordination.on('task:cancelled', (data) => {
      this.emit('task:cancelled', data);
    });

    // Forward reputation events
    this.reputation.on('reputation:updated', (score) => {
      this.marketplace.updateReputation(score.score);
      this.emit('reputation:updated', score);
    });
  }

  private registerDefaultTaskTypes(): void {
    // Transport task
    this.registerTaskType({
      type: 'transport',
      requiredCapabilities: ['transport'],
      verificationRules: {
        requireProof: true,
        requireWitness: false
      },
      pricing: {
        basePrice: 100,
        variableFactors: ['distance', 'weight']
      },
      description: 'Transport items from one location to another'
    });

    // Picking task
    this.registerTaskType({
      type: 'picking',
      requiredCapabilities: ['picking'],
      verificationRules: {
        requireProof: true,
        requireWitness: false
      },
      pricing: {
        basePrice: 50,
        variableFactors: ['items', 'complexity']
      },
      description: 'Pick items from warehouse shelves'
    });

    // Sorting task
    this.registerTaskType({
      type: 'sorting',
      requiredCapabilities: ['sorting'],
      verificationRules: {
        requireProof: true,
        requireWitness: false
      },
      pricing: {
        basePrice: 75,
        variableFactors: ['items', 'categories']
      },
      description: 'Sort items by category'
    });

    // Inspection task
    this.registerTaskType({
      type: 'inspection',
      requiredCapabilities: ['inspection'],
      verificationRules: {
        requireProof: true,
        requireWitness: true,
        minReputation: 4.0
      },
      pricing: {
        basePrice: 200,
        variableFactors: ['complexity']
      },
      description: 'Inspect equipment or inventory'
    });
  }
}

export default AutoGridOS;
