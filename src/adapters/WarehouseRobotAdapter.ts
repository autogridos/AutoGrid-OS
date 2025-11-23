/**
 * Warehouse Robot Adapter
 * 
 * Provides integration layer for warehouse automation systems
 */

import { AutoGridOS, DeviceType, Task } from '../index';
import EventEmitter from 'eventemitter3';

export interface WarehouseRobotConfig {
  deviceId: string;
  privateKey: string;
  warehouseId: string;
  capabilities: WarehouseCapability[];
  initialLocation?: { x: number; y: number; floor: number };
  maxLoad?: number;
  batteryCapacity?: number;
}

export type WarehouseCapability = 
  | 'transport'
  | 'picking'
  | 'sorting'
  | 'packing'
  | 'inventory'
  | 'heavy-lift'
  | 'precision-handling';

export class WarehouseRobotAdapter extends EventEmitter {
  private os: AutoGridOS;
  private config: WarehouseRobotConfig;
  private currentLoad: number = 0;
  private batteryLevel: number = 100;
  private isCharging: boolean = false;

  constructor(config: WarehouseRobotConfig) {
    super();
    this.config = config;

    // Initialize AutoGrid OS
    this.os = new AutoGridOS({
      deviceId: config.deviceId,
      deviceType: DeviceType.WAREHOUSE,
      privateKey: config.privateKey,
      capabilities: config.capabilities,
      location: config.initialLocation,
      metadata: {
        warehouseId: config.warehouseId,
        maxLoad: config.maxLoad || 100,
        batteryCapacity: config.batteryCapacity || 10000
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Start the warehouse robot
   */
  async start(): Promise<void> {
    await this.os.connect();
    this.emit('robot:started', {
      deviceId: this.config.deviceId,
      location: this.config.initialLocation
    });
  }

  /**
   * Stop the warehouse robot
   */
  async stop(): Promise<void> {
    await this.os.disconnect();
    this.emit('robot:stopped', { deviceId: this.config.deviceId });
  }

  /**
   * Execute a transport task
   */
  async executeTransport(task: Task): Promise<void> {
    const { from, to, items, weight } = task.payload;

    this.emit('transport:started', { task, from, to });

    // Check if robot can handle the load
    if (weight > (this.config.maxLoad || 100)) {
      throw new Error('Item weight exceeds robot capacity');
    }

    // Navigate to pickup location
    await this.navigateTo(from);
    this.emit('transport:pickup', { location: from, items });

    // Load items
    this.currentLoad += weight;

    // Navigate to delivery location
    await this.navigateTo(to);
    this.emit('transport:delivery', { location: to, items });

    // Unload items
    this.currentLoad -= weight;

    this.emit('transport:completed', { task });
  }

  /**
   * Execute a picking task
   */
  async executePicking(task: Task): Promise<void> {
    const { orderId, items, location } = task.payload;

    this.emit('picking:started', { task, orderId });

    // Navigate to picking location
    await this.navigateTo(location);

    // Pick each item
    for (const item of items) {
      await this.pickItem(item);
      this.emit('picking:item-picked', { item });
    }

    this.emit('picking:completed', { task, orderId, itemCount: items.length });
  }

  /**
   * Execute a sorting task
   */
  async executeSorting(task: Task): Promise<void> {
    const { items, categories, location } = task.payload;

    this.emit('sorting:started', { task, itemCount: items.length });

    await this.navigateTo(location);

    // Sort items by category
    const sorted: Record<string, any[]> = {};
    for (const item of items) {
      const category = this.categorizeItem(item, categories);
      if (!sorted[category]) {
        sorted[category] = [];
      }
      sorted[category].push(item);
    }

    this.emit('sorting:completed', { task, sorted });
  }

  /**
   * Request charging
   */
  async requestCharging(): Promise<void> {
    if (this.isCharging) {
      return;
    }

    this.emit('charging:requested', { batteryLevel: this.batteryLevel });

    // Find nearest charging station (simplified)
    const chargingStation = { x: 0, y: 0, floor: 1 };
    await this.navigateTo(chargingStation);

    this.isCharging = true;
    this.emit('charging:started', { location: chargingStation });

    // Simulate charging
    await this.charge();

    this.isCharging = false;
    this.emit('charging:completed', { batteryLevel: this.batteryLevel });
  }

  /**
   * Get robot status
   */
  getStatus() {
    return {
      deviceId: this.config.deviceId,
      location: this.os.getLocation(),
      currentLoad: this.currentLoad,
      maxLoad: this.config.maxLoad || 100,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      balance: this.os.getBalance(),
      activeTasks: this.os.getActiveTasks().length
    };
  }

  /**
   * Navigate to a location
   */
  private async navigateTo(location: { x: number; y: number; floor?: number }): Promise<void> {
    const currentLocation = this.os.getLocation();
    if (!currentLocation) {
      throw new Error('Current location unknown');
    }

    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(location.x - currentLocation.x, 2) +
      Math.pow(location.y - currentLocation.y, 2)
    );

    // Simulate navigation (1 meter per 100ms)
    const travelTime = distance * 100;
    this.emit('navigation:started', { from: currentLocation, to: location, distance });

    await new Promise(resolve => setTimeout(resolve, travelTime));

    // Consume battery
    this.batteryLevel = Math.max(0, this.batteryLevel - (distance * 0.1));

    // Update location
    this.os.updateLocation(location);
    this.emit('navigation:completed', { location, batteryLevel: this.batteryLevel });

    // Auto-request charging if battery low
    if (this.batteryLevel < 20 && !this.isCharging) {
      await this.requestCharging();
    }
  }

  /**
   * Pick an item
   */
  private async pickItem(item: any): Promise<void> {
    // Simulate picking time
    await new Promise(resolve => setTimeout(resolve, 500));
    this.batteryLevel = Math.max(0, this.batteryLevel - 0.5);
  }

  /**
   * Categorize an item
   */
  private categorizeItem(item: any, categories: string[]): string {
    // Simple categorization logic
    return item.category || categories[0] || 'uncategorized';
  }

  /**
   * Charge the robot
   */
  private async charge(): Promise<void> {
    while (this.batteryLevel < 100) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.batteryLevel = Math.min(100, this.batteryLevel + 10);
      this.emit('charging:progress', { batteryLevel: this.batteryLevel });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.os.onTaskAssigned(async (task) => {
      try {
        this.emit('task:assigned', task);

        // Execute based on task type
        switch (task.type) {
          case 'transport':
            await this.executeTransport(task);
            break;
          case 'picking':
            await this.executePicking(task);
            break;
          case 'sorting':
            await this.executeSorting(task);
            break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        // Submit proof of completion
        const result = {
          completed: true,
          timestamp: Date.now(),
          location: this.os.getLocation(),
          batteryLevel: this.batteryLevel
        };

        await this.os.submitProof(task.id, result);
        this.emit('task:completed', { task, result });

      } catch (error) {
        this.emit('task:failed', { task, error });
      }
    });

    this.os.on('payment:received', (payment) => {
      this.emit('payment:received', payment);
    });

    this.os.on('reputation:updated', (score) => {
      this.emit('reputation:updated', score);
    });
  }
}
