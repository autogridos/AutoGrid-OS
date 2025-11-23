import EventEmitter from 'eventemitter3';
import { FleetConfig, FleetMetrics, Task, Location } from '../types';

export class FleetManager extends EventEmitter {
  private fleetId: string;
  private devices: Map<string, DeviceInfo> = new Map();
  private config: FleetConfig;
  private metrics: FleetMetrics;

  constructor(config: FleetConfig) {
    super();
    this.fleetId = config.fleetId;
    this.config = config;

    for (const deviceId of config.devices) {
      this.devices.set(deviceId, {
        deviceId,
        status: 'idle',
        currentLoad: 0,
        tasksCompleted: 0,
        totalRevenue: 0,
        reputation: 3.0
      });
    }

    this.metrics = this.initializeMetrics();
  }

  enableInternalMarket(options: {
    allowTaskSwapping?: boolean;
    allowResourceSharing?: boolean;
    dynamicPricing?: boolean;
  }): void {
    this.config.allowInternalMarket = true;
    this.config.allowTaskSwapping = options.allowTaskSwapping ?? true;
    this.config.allowResourceSharing = options.allowResourceSharing ?? true;
    this.config.dynamicPricing = options.dynamicPricing ?? true;

    this.emit('internal-market:enabled', options);
  }

  async optimizeDistribution(tasks: Task[]): Promise<Map<string, Task[]>> {
    const distribution = new Map<string, Task[]>();

    for (const deviceId of this.devices.keys()) {
      distribution.set(deviceId, []);
    }

    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.reward - a.reward;
    });

    for (const task of sortedTasks) {
      const bestDevice = this.findBestDevice(task);
      if (bestDevice) {
        const deviceTasks = distribution.get(bestDevice) || [];
        deviceTasks.push(task);
        distribution.set(bestDevice, deviceTasks);

        const device = this.devices.get(bestDevice);
        if (device) {
          device.currentLoad++;
          device.status = 'busy';
        }
      }
    }

    this.emit('distribution:optimized', distribution);
    return distribution;
  }

  async requestTaskSwap(params: {
    fromDeviceId: string;
    toDeviceId: string;
    taskId: string;
    payment: number;
  }): Promise<boolean> {
    if (!this.config.allowTaskSwapping) {
      return false;
    }

    const fromDevice = this.devices.get(params.fromDeviceId);
    const toDevice = this.devices.get(params.toDeviceId);

    if (!fromDevice || !toDevice) {
      return false;
    }

    if (toDevice.currentLoad >= 10) {
      return false;
    }

    fromDevice.currentLoad--;
    toDevice.currentLoad++;
    
    fromDevice.totalRevenue -= params.payment;
    toDevice.totalRevenue += params.payment;

    this.emit('task:swapped', params);
    return true;
  }

  async shareResource(params: {
    fromDeviceId: string;
    toDeviceId: string;
    resourceType: string;
    amount: number;
    payment: number;
  }): Promise<boolean> {
    if (!this.config.allowResourceSharing) {
      return false;
    }

    const fromDevice = this.devices.get(params.fromDeviceId);
    const toDevice = this.devices.get(params.toDeviceId);

    if (!fromDevice || !toDevice) {
      return false;
    }

    fromDevice.totalRevenue += params.payment;
    toDevice.totalRevenue -= params.payment;

    this.emit('resource:shared', params);
    return true;
  }

  recordCompletion(deviceId: string, task: Task, revenue: number): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }

    device.tasksCompleted++;
    device.totalRevenue += revenue;
    device.currentLoad = Math.max(0, device.currentLoad - 1);
    
    if (device.currentLoad === 0) {
      device.status = 'idle';
    }

    this.updateMetrics();
    this.emit('task:completed', { deviceId, task, revenue });
  }

  getMetrics(): FleetMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getDeviceInfo(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  addDevice(deviceId: string): void {
    if (this.devices.has(deviceId)) {
      return;
    }

    this.devices.set(deviceId, {
      deviceId,
      status: 'idle',
      currentLoad: 0,
      tasksCompleted: 0,
      totalRevenue: 0,
      reputation: 3.0
    });

    this.config.devices.push(deviceId);
    this.emit('device:added', deviceId);
  }

  removeDevice(deviceId: string): void {
    if (!this.devices.has(deviceId)) {
      return;
    }

    this.devices.delete(deviceId);
    this.config.devices = this.config.devices.filter(id => id !== deviceId);
    this.emit('device:removed', deviceId);
  }

  getEfficiencyScore(): number {
    const devices = Array.from(this.devices.values());
    if (devices.length === 0) return 0;

    const totalUtilization = devices.reduce((sum, d) => sum + (d.currentLoad / 10), 0);
    const avgUtilization = totalUtilization / devices.length;
    const avgReputation = devices.reduce((sum, d) => sum + d.reputation, 0) / devices.length;

    return (avgUtilization * 0.6 + avgReputation / 5 * 0.4) * 100;
  }

  private findBestDevice(task: Task): string | undefined {
    const availableDevices = Array.from(this.devices.entries())
      .filter(([_, device]) => device.status === 'idle' || device.currentLoad < 10)
      .sort((a, b) => {
        const loadDiff = a[1].currentLoad - b[1].currentLoad;
        if (loadDiff !== 0) return loadDiff;
        return b[1].reputation - a[1].reputation;
      });

    return availableDevices.length > 0 ? availableDevices[0][0] : undefined;
  }

  private updateMetrics(): void {
    const devices = Array.from(this.devices.values());
    
    const totalTasks = devices.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalRevenue = devices.reduce((sum, d) => sum + d.totalRevenue, 0);
    const avgUtilization = devices.length > 0
      ? devices.reduce((sum, d) => sum + (d.currentLoad / 10), 0) / devices.length
      : 0;

    this.metrics = {
      fleetId: this.fleetId,
      efficiency: this.getEfficiencyScore(),
      avgTaskTime: 0,
      totalTasksCompleted: totalTasks,
      totalRevenue,
      avgDeviceUtilization: avgUtilization,
      timestamp: Date.now()
    };
  }

  private initializeMetrics(): FleetMetrics {
    return {
      fleetId: this.fleetId,
      efficiency: 0,
      avgTaskTime: 0,
      totalTasksCompleted: 0,
      totalRevenue: 0,
      avgDeviceUtilization: 0,
      timestamp: Date.now()
    };
  }
}

interface DeviceInfo {
  deviceId: string;
  status: 'idle' | 'busy' | 'offline';
  currentLoad: number;
  tasksCompleted: number;
  totalRevenue: number;
  reputation: number;
  location?: Location;
}