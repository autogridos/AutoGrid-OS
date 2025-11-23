import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Task, Bid, TaskFilter, BidStrategy, TaskStatus, Location } from '../types';

export interface TaskMarketplaceConfig {
  deviceId: string;
  location?: Location;
  reputation?: number;
  capabilities?: string[];
}

export class TaskMarketplace extends EventEmitter {
  private deviceId: string;
  private location?: Location;
  private reputation: number;
  private capabilities: string[];
  private availableTasks: Map<string, Task> = new Map();
  private activeBids: Map<string, Bid> = new Map();
  private wonBids: Map<string, Task> = new Map();

  constructor(config: TaskMarketplaceConfig) {
    super();
    this.deviceId = config.deviceId;
    this.location = config.location;
    this.reputation = config.reputation || 3.0;
    this.capabilities = config.capabilities || [];
  }

  async getAvailableTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.availableTasks.values());

    if (!filter) {
      return tasks;
    }

    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }

    if (filter.minReward !== undefined) {
      tasks = tasks.filter(t => t.reward >= filter.minReward!);
    }

    if (filter.maxReward !== undefined) {
      tasks = tasks.filter(t => t.reward <= filter.maxReward!);
    }

    if (filter.capabilities && filter.capabilities.length > 0) {
      tasks = tasks.filter(t =>
        filter.capabilities!.every(cap => t.requirements.capabilities.includes(cap))
      );
    }

    if (filter.minReputation !== undefined) {
      tasks = tasks.filter(t =>
        !t.requirements.minReputation || this.reputation >= t.requirements.minReputation
      );
    }

    if (filter.priority) {
      tasks = tasks.filter(t => t.priority === filter.priority);
    }

    return tasks;
  }

  async submitBid(
    taskId: string,
    params: {
      price: number | 'auto';
      estimatedDuration: number;
      strategy?: BidStrategy;
    }
  ): Promise<Bid> {
    const task = this.availableTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.BIDDING) {
      throw new Error('Task is not accepting bids');
    }

    const price = params.price === 'auto'
      ? this.calculateOptimalPrice(task, params.strategy)
      : params.price;

    const bid: Bid = {
      id: uuidv4(),
      taskId,
      deviceId: this.deviceId,
      price,
      estimatedDuration: params.estimatedDuration,
      reputation: this.reputation,
      distance: this.location ? this.calculateDistance(task) : undefined,
      timestamp: Date.now()
    };

    this.activeBids.set(bid.id, bid);
    this.emit('bid:submitted', bid);

    return bid;
  }

  async withdrawBid(bidId: string): Promise<void> {
    const bid = this.activeBids.get(bidId);
    if (!bid) {
      throw new Error('Bid not found');
    }

    this.activeBids.delete(bidId);
    this.emit('bid:withdrawn', bid);
  }

  async handleBidWon(taskId: string): Promise<void> {
    const task = this.availableTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.assignedTo = this.deviceId;
    task.status = TaskStatus.ASSIGNED;

    this.wonBids.set(taskId, task);
    this.availableTasks.delete(taskId);

    for (const [bidId, bid] of this.activeBids.entries()) {
      if (bid.taskId === taskId) {
        this.activeBids.delete(bidId);
      }
    }

    this.emit('bid:won', task);
  }

  addTask(task: Task): void {
    this.availableTasks.set(task.id, task);
    this.emit('task:available', task);
  }

  removeTask(taskId: string): void {
    const task = this.availableTasks.get(taskId);
    if (task) {
      this.availableTasks.delete(taskId);
      this.emit('task:removed', task);
    }
  }

  getActiveBids(): Bid[] {
    return Array.from(this.activeBids.values());
  }

  getWonTasks(): Task[] {
    return Array.from(this.wonBids.values());
  }

  updateReputation(score: number): void {
    this.reputation = score;
    this.emit('reputation:updated', score);
  }

  updateLocation(location: Location): void {
    this.location = location;
    this.emit('location:updated', location);
  }

  private calculateOptimalPrice(task: Task, strategy?: BidStrategy): number {
    const basePrice = task.reward * 0.8;

    switch (strategy) {
      case 'aggressive':
        return basePrice * 0.7;
      case 'conservative':
        return basePrice * 1.2;
      case 'competitive':
        return basePrice;
      case 'auto':
      default:
        let multiplier = 1.0;
        
        if (this.reputation > 4.0) {
          multiplier *= 1.1;
        } else if (this.reputation < 3.0) {
          multiplier *= 0.9;
        }

        if (this.location) {
          const distance = this.calculateDistance(task);
          if (distance < 10) {
            multiplier *= 0.95;
          } else if (distance > 50) {
            multiplier *= 1.1;
          }
        }

        return basePrice * multiplier;
    }
  }

  private calculateDistance(task: Task): number {
    if (!this.location) {
      return 0;
    }

    const taskLocation = task.payload.location as Location | undefined;
    if (!taskLocation) {
      return 0;
    }

    const dx = this.location.x - taskLocation.x;
    const dy = this.location.y - taskLocation.y;
    const dz = (this.location.z || 0) - (taskLocation.z || 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getMarketStats() {
    const tasks = Array.from(this.availableTasks.values());
    
    return {
      totalTasks: tasks.length,
      averageReward: tasks.length > 0
        ? tasks.reduce((sum, t) => sum + t.reward, 0) / tasks.length
        : 0,
      activeBids: this.activeBids.size,
      wonTasks: this.wonBids.size,
      tasksByPriority: {
        critical: tasks.filter(t => t.priority === 'critical').length,
        high: tasks.filter(t => t.priority === 'high').length,
        normal: tasks.filter(t => t.priority === 'normal').length,
        low: tasks.filter(t => t.priority === 'low').length
      }
    };
  }
}