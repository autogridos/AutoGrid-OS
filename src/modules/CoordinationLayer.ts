import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskPriority, Location } from '../types';

export interface CoordinationLayerConfig {
  deviceId: string;
  location?: Location;
  capabilities?: string[];
}

export class CoordinationLayer extends EventEmitter {
  private deviceId: string;
  private location?: Location;
  private capabilities: string[];
  private activeTasks: Map<string, Task> = new Map();
  private taskQueue: Task[] = [];
  private routes: Map<string, Route> = new Map();

  constructor(config: CoordinationLayerConfig) {
    super();
    this.deviceId = config.deviceId;
    this.location = config.location;
    this.capabilities = config.capabilities || [];
  }

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
  }): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      type: params.type,
      status: TaskStatus.PENDING,
      priority: params.priority || TaskPriority.NORMAL,
      publisherId: this.deviceId,
      payload: params.payload,
      requirements: {
        capabilities: params.requirements?.capabilities || [],
        minReputation: params.requirements?.minReputation,
        maxDistance: params.requirements?.maxDistance
      },
      reward: params.maxPrice || 0,
      deadline: params.deadline,
      createdAt: Date.now()
    };

    this.activeTasks.set(task.id, task);
    this.emit('task:published', task);
    return task;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = Date.now();
    }

    this.emit('task:updated', { task, metadata });
  }

  async assignTask(taskId: string, deviceId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.BIDDING) {
      throw new Error('Task is not available for assignment');
    }

    task.assignedTo = deviceId;
    task.status = TaskStatus.ASSIGNED;

    this.emit('task:assigned', { task, deviceId });
  }

  async createRoute(params: {
    taskId: string;
    waypoints: Location[];
    estimatedDuration: number;
    priority: TaskPriority;
  }): Promise<Route> {
    const route: Route = {
      id: uuidv4(),
      taskId: params.taskId,
      deviceId: this.deviceId,
      waypoints: params.waypoints,
      currentWaypoint: 0,
      estimatedDuration: params.estimatedDuration,
      priority: params.priority,
      createdAt: Date.now(),
      status: 'active'
    };

    this.routes.set(route.id, route);
    this.emit('route:created', route);
    return route;
  }

  async updateRoute(routeId: string, waypointIndex: number): Promise<void> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    route.currentWaypoint = waypointIndex;

    if (waypointIndex >= route.waypoints.length - 1) {
      route.status = 'completed';
      route.completedAt = Date.now();
      this.emit('route:completed', route);
    } else {
      this.emit('route:updated', route);
    }
  }

  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.activeTasks.get(taskId);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.activeTasks.values()).filter(task => task.status === status);
  }

  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = TaskStatus.CANCELLED;
    this.emit('task:cancelled', { task, reason });
  }

  canExecuteTask(task: Task): boolean {
    const hasCapabilities = task.requirements.capabilities.every(
      cap => this.capabilities.includes(cap)
    );

    if (!hasCapabilities) {
      return false;
    }

    return true;
  }

  queueTask(task: Task): void {
    this.taskQueue.push(task);
    this.emit('task:queued', task);
  }

  getNextQueuedTask(): Task | undefined {
    return this.taskQueue.shift();
  }

  updateLocation(location: Location): void {
    this.location = location;
    this.emit('location:updated', location);
  }

  getLocation(): Location | undefined {
    return this.location;
  }

  addCapability(capability: string): void {
    if (!this.capabilities.includes(capability)) {
      this.capabilities.push(capability);
      this.emit('capability:added', capability);
    }
  }

  removeCapability(capability: string): void {
    const index = this.capabilities.indexOf(capability);
    if (index > -1) {
      this.capabilities.splice(index, 1);
      this.emit('capability:removed', capability);
    }
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }
}

interface Route {
  id: string;
  taskId: string;
  deviceId: string;
  waypoints: Location[];
  currentWaypoint: number;
  estimatedDuration: number;
  priority: TaskPriority;
  createdAt: number;
  completedAt?: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
}