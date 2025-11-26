/**
 * Service Robot Adapter
 * 
 * Provides integration layer for service robots like hospitality,
 * delivery, and customer service bots.
 */

import { AutoGridOS, DeviceType, Task } from '../index';
import EventEmitter from 'eventemitter3';

export interface ServiceRobotConfig {
  deviceId: string;
  privateKey: string;
  serviceType: ServiceType;
  capabilities: ServiceCapability[];
  initialLocation?: { x: number; y: number; floor: number };
  maxSpeed?: number;
  batteryCapacity?: number;
  interactionLanguages?: string[];
}

export type ServiceType = 
  | 'hospitality'
  | 'delivery'
  | 'concierge'
  | 'security'
  | 'cleaning'
  | 'guide';

export type ServiceCapability = 
  | 'navigation'
  | 'speech'
  | 'delivery'
  | 'cleaning'
  | 'patrol'
  | 'customer-interaction'
  | 'elevator-control'
  | 'door-access'
  | 'payment-processing';

export interface DeliveryTask {
  orderId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  destination: {
    room: string;
    floor: number;
    x: number;
    y: number;
  };
  recipientName?: string;
  specialInstructions?: string;
}

export interface CleaningTask {
  areaId: string;
  cleaningType: 'routine' | 'deep' | 'spot';
  zones: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  priority: 'low' | 'normal' | 'high';
}

export class ServiceRobotAdapter extends EventEmitter {
  private os: AutoGridOS;
  private config: ServiceRobotConfig;
  private batteryLevel: number = 100;
  private isCharging: boolean = false;
  private currentTask: Task | null = null;
  private interactionCount: number = 0;

  constructor(config: ServiceRobotConfig) {
    super();
    this.config = config;

    // Initialize AutoGrid OS
    this.os = new AutoGridOS({
      deviceId: config.deviceId,
      deviceType: DeviceType.SERVICE,
      privateKey: config.privateKey,
      capabilities: config.capabilities,
      location: config.initialLocation,
      metadata: {
        serviceType: config.serviceType,
        maxSpeed: config.maxSpeed || 1.5,
        batteryCapacity: config.batteryCapacity || 8000,
        languages: config.interactionLanguages || ['en']
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Start the service robot
   */
  async start(): Promise<void> {
    await this.os.connect();
    this.emit('robot:started', {
      deviceId: this.config.deviceId,
      serviceType: this.config.serviceType,
      location: this.config.initialLocation
    });
  }

  /**
   * Stop the service robot
   */
  async stop(): Promise<void> {
    await this.os.disconnect();
    this.emit('robot:stopped', { deviceId: this.config.deviceId });
  }

  /**
   * Execute a delivery task
   */
  async executeDelivery(task: Task): Promise<void> {
    const delivery = task.payload as DeliveryTask;
    this.currentTask = task;

    this.emit('delivery:started', { task, delivery });

    try {
      // Navigate to pickup location
      await this.navigateTo({ x: 0, y: 0, floor: 1 }); // Pickup point
      this.emit('delivery:pickup', { orderId: delivery.orderId });

      // Navigate to destination
      await this.navigateTo(delivery.destination);

      // Wait for recipient
      if (delivery.recipientName) {
        await this.announceArrival(delivery.destination.room, delivery.recipientName);
      }

      // Complete delivery
      this.emit('delivery:completed', { 
        task, 
        orderId: delivery.orderId,
        deliveredTo: delivery.destination.room
      });

    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Execute a cleaning task
   */
  async executeCleaning(task: Task): Promise<void> {
    const cleaning = task.payload as CleaningTask;
    this.currentTask = task;

    this.emit('cleaning:started', { task, areaId: cleaning.areaId });

    try {
      for (let i = 0; i < cleaning.zones.length; i++) {
        const zone = cleaning.zones[i];
        
        // Navigate to zone
        await this.navigateTo({ x: zone.x, y: zone.y, floor: 1 });
        
        // Clean zone
        await this.cleanZone(zone, cleaning.cleaningType);
        
        this.emit('cleaning:zone-completed', { 
          zoneIndex: i, 
          totalZones: cleaning.zones.length,
          progress: ((i + 1) / cleaning.zones.length) * 100
        });
      }

      this.emit('cleaning:completed', { task, areaId: cleaning.areaId });

    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Execute a patrol task
   */
  async executePatrol(task: Task): Promise<void> {
    const patrol = task.payload as {
      checkpoints: Array<{ x: number; y: number; floor: number }>;
      reportAnomalies: boolean;
    };

    this.currentTask = task;
    this.emit('patrol:started', { task, checkpoints: patrol.checkpoints.length });

    try {
      const anomalies: any[] = [];

      for (let i = 0; i < patrol.checkpoints.length; i++) {
        const checkpoint = patrol.checkpoints[i];
        
        await this.navigateTo(checkpoint);
        
        // Perform checkpoint inspection
        const inspection = await this.inspectCheckpoint(checkpoint);
        
        if (inspection.anomaly && patrol.reportAnomalies) {
          anomalies.push({
            location: checkpoint,
            type: inspection.anomalyType,
            timestamp: Date.now()
          });
          
          this.emit('patrol:anomaly-detected', inspection);
        }

        this.emit('patrol:checkpoint-reached', {
          checkpointIndex: i,
          totalCheckpoints: patrol.checkpoints.length
        });
      }

      this.emit('patrol:completed', { task, anomaliesFound: anomalies.length, anomalies });

    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Execute a customer interaction task
   */
  async executeInteraction(task: Task): Promise<void> {
    const interaction = task.payload as {
      type: 'greeting' | 'assistance' | 'information' | 'guidance';
      location: { x: number; y: number; floor: number };
      language?: string;
      script?: string[];
    };

    this.currentTask = task;
    this.emit('interaction:started', { task, type: interaction.type });

    try {
      await this.navigateTo(interaction.location);

      // Perform interaction
      const result = await this.performInteraction(interaction);
      
      this.interactionCount++;

      this.emit('interaction:completed', { 
        task, 
        success: result.success,
        feedback: result.feedback
      });

    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Request charging
   */
  async requestCharging(): Promise<void> {
    if (this.isCharging) {
      return;
    }

    this.emit('charging:requested', { batteryLevel: this.batteryLevel });

    // Find nearest charging station
    const chargingStation = await this.findChargingStation();
    await this.navigateTo(chargingStation);

    this.isCharging = true;
    this.emit('charging:started', { location: chargingStation });

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
      serviceType: this.config.serviceType,
      location: this.os.getLocation(),
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      currentTask: this.currentTask?.id || null,
      interactionCount: this.interactionCount,
      balance: this.os.getBalance(),
      reputation: 0
    };
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    return {
      totalInteractions: this.interactionCount,
      deviceId: this.config.deviceId,
      serviceType: this.config.serviceType
    };
  }

  // ==================== Private Methods ====================

  private async navigateTo(location: { x: number; y: number; floor?: number }): Promise<void> {
    const currentLocation = this.os.getLocation();
    if (!currentLocation) {
      throw new Error('Current location unknown');
    }

    // Handle floor change if needed
    if (location.floor && currentLocation.floor !== location.floor) {
      await this.changeFloor(location.floor);
    }

    const distance = Math.sqrt(
      Math.pow(location.x - currentLocation.x, 2) +
      Math.pow(location.y - currentLocation.y, 2)
    );

    const speed = this.config.maxSpeed || 1.5;
    const travelTime = (distance / speed) * 1000;

    this.emit('navigation:started', { from: currentLocation, to: location, distance });

    await new Promise(resolve => setTimeout(resolve, travelTime));

    // Consume battery
    this.batteryLevel = Math.max(0, this.batteryLevel - (distance * 0.05));

    this.os.updateLocation(location);
    this.emit('navigation:completed', { location, batteryLevel: this.batteryLevel });

    // Auto-request charging if battery low
    if (this.batteryLevel < 15 && !this.isCharging) {
      await this.requestCharging();
    }
  }

  private async changeFloor(targetFloor: number): Promise<void> {
    this.emit('elevator:requested', { targetFloor });
    
    // Simulate elevator wait and travel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.emit('elevator:arrived', { floor: targetFloor });
  }

  private async announceArrival(room: string, recipientName: string): Promise<void> {
    this.emit('announcement:made', { room, recipientName });
    
    // Wait for acknowledgment (simulate)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async cleanZone(
    zone: { x: number; y: number; width: number; height: number },
    cleaningType: string
  ): Promise<void> {
    const area = zone.width * zone.height;
    const cleaningTime = area * (cleaningType === 'deep' ? 200 : cleaningType === 'spot' ? 50 : 100);
    
    await new Promise(resolve => setTimeout(resolve, cleaningTime));
    
    // Consume battery based on cleaning type
    const batteryConsumption = cleaningType === 'deep' ? 2 : cleaningType === 'spot' ? 0.5 : 1;
    this.batteryLevel = Math.max(0, this.batteryLevel - batteryConsumption);
  }

  private async inspectCheckpoint(
    checkpoint: { x: number; y: number; floor: number }
  ): Promise<{ anomaly: boolean; anomalyType?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate random anomaly detection (10% chance)
    const hasAnomaly = Math.random() < 0.1;
    
    return {
      anomaly: hasAnomaly,
      anomalyType: hasAnomaly ? 'unusual_activity' : undefined
    };
  }

  private async performInteraction(params: {
    type: string;
    language?: string;
    script?: string[];
  }): Promise<{ success: boolean; feedback?: string }> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      success: true,
      feedback: 'Interaction completed successfully'
    };
  }

  private async findChargingStation(): Promise<{ x: number; y: number; floor: number }> {
    // In real implementation, this would query the system for nearest available station
    return { x: 0, y: 0, floor: 1 };
  }

  private async charge(): Promise<void> {
    while (this.batteryLevel < 100) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.batteryLevel = Math.min(100, this.batteryLevel + 5);
      this.emit('charging:progress', { batteryLevel: this.batteryLevel });
    }
  }

  private setupEventHandlers(): void {
    this.os.onTaskAssigned(async (task) => {
      try {
        this.emit('task:assigned', task);

        switch (task.type) {
          case 'delivery':
            await this.executeDelivery(task);
            break;
          case 'cleaning':
            await this.executeCleaning(task);
            break;
          case 'patrol':
            await this.executePatrol(task);
            break;
          case 'interaction':
            await this.executeInteraction(task);
            break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

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

export default ServiceRobotAdapter;
