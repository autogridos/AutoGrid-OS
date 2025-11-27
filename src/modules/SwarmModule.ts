/**
 * Swarm Intelligence Module
 * 
 * Enables collective problem-solving through swarm coordination.
 * Supports multiple algorithms: ant-colony, particle-swarm, boids, and consensus.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Location, Task, TaskPriority } from '../types';

// ==================== Types ====================

export enum SwarmAlgorithm {
  ANT_COLONY = 'ant-colony',
  PARTICLE_SWARM = 'particle-swarm',
  BOIDS = 'boids',
  CONSENSUS = 'consensus',
  GRADIENT_DESCENT = 'gradient-descent'
}

export enum SwarmFormation {
  LINE = 'line',
  CIRCLE = 'circle',
  GRID = 'grid',
  V_SHAPE = 'v-shape',
  SURROUND = 'surround',
  SCATTER = 'scatter',
  CONVOY = 'convoy'
}

export enum SwarmState {
  FORMING = 'forming',
  ACTIVE = 'active',
  EXECUTING = 'executing',
  DISPERSING = 'dispersing',
  DISBANDED = 'disbanded'
}

export interface SwarmConfig {
  swarmId?: string;
  taskId: string;
  minDevices: number;
  maxDevices?: number;
  algorithm: SwarmAlgorithm;
  leader?: string;
  timeout?: number;
  autoDisband?: boolean;
}

export interface SwarmMember {
  deviceId: string;
  role: 'leader' | 'follower' | 'scout' | 'worker';
  position?: Location;
  velocity?: Vector3D;
  state: 'joining' | 'ready' | 'busy' | 'offline';
  capabilities: string[];
  joinedAt: number;
  lastHeartbeat: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SwarmTask {
  id: string;
  type: 'search' | 'transport' | 'surround' | 'map' | 'clean' | 'custom';
  target?: Location;
  area?: { min: Location; max: Location };
  payload?: Record<string, any>;
  assignedMembers: string[];
  progress: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PheromoneTrail {
  id: string;
  path: Location[];
  strength: number;
  type: 'resource' | 'danger' | 'path' | 'target';
  createdBy: string;
  createdAt: number;
  decayRate: number;
}

export interface SwarmMetrics {
  swarmId: string;
  memberCount: number;
  coverage: number;
  efficiency: number;
  convergenceRate: number;
  tasksCompleted: number;
  totalDistance: number;
  avgResponseTime: number;
}

// ==================== Swarm Class ====================

export class Swarm extends EventEmitter {
  readonly id: string;
  readonly taskId: string;
  readonly algorithm: SwarmAlgorithm;
  
  private members: Map<string, SwarmMember> = new Map();
  private leader?: string;
  private state: SwarmState = SwarmState.FORMING;
  private minDevices: number;
  private maxDevices: number;
  private swarmTasks: Map<string, SwarmTask> = new Map();
  private pheromones: Map<string, PheromoneTrail> = new Map();
  private formationPositions: Map<string, Location> = new Map();
  private metrics: SwarmMetrics;
  private heartbeatInterval?: NodeJS.Timeout;
  private pheromoneDecayInterval?: NodeJS.Timeout;

  constructor(config: SwarmConfig) {
    super();
    this.id = config.swarmId || uuidv4();
    this.taskId = config.taskId;
    this.algorithm = config.algorithm;
    this.minDevices = config.minDevices;
    this.maxDevices = config.maxDevices || config.minDevices * 2;
    this.leader = config.leader;

    this.metrics = {
      swarmId: this.id,
      memberCount: 0,
      coverage: 0,
      efficiency: 0,
      convergenceRate: 0,
      tasksCompleted: 0,
      totalDistance: 0,
      avgResponseTime: 0
    };

    this.startHeartbeatMonitor();
    this.startPheromoneDecay();
  }

  // ==================== Member Management ====================

  async join(member: {
    deviceId: string;
    capabilities: string[];
    position?: Location;
  }): Promise<boolean> {
    if (this.members.size >= this.maxDevices) {
      return false;
    }

    if (this.state === SwarmState.DISBANDED) {
      return false;
    }

    const swarmMember: SwarmMember = {
      deviceId: member.deviceId,
      role: this.members.size === 0 && !this.leader ? 'leader' : 'follower',
      position: member.position,
      velocity: { x: 0, y: 0, z: 0 },
      state: 'joining',
      capabilities: member.capabilities,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    if (swarmMember.role === 'leader') {
      this.leader = member.deviceId;
    }

    this.members.set(member.deviceId, swarmMember);
    this.updateMetrics();

    // Check if swarm is ready
    if (this.members.size >= this.minDevices && this.state === SwarmState.FORMING) {
      this.state = SwarmState.ACTIVE;
      this.emit('swarm:ready', { swarmId: this.id, memberCount: this.members.size });
    }

    this.emit('member:joined', swarmMember);
    return true;
  }

  async leave(deviceId: string): Promise<void> {
    const member = this.members.get(deviceId);
    if (!member) return;

    this.members.delete(deviceId);
    this.formationPositions.delete(deviceId);

    // Elect new leader if leader left
    if (this.leader === deviceId && this.members.size > 0) {
      const newLeader = this.electLeader();
      this.leader = newLeader;
      const leaderMember = this.members.get(newLeader);
      if (leaderMember) {
        leaderMember.role = 'leader';
      }
      this.emit('leader:elected', { deviceId: newLeader });
    }

    this.updateMetrics();
    this.emit('member:left', { deviceId });

    // Check if swarm should disband
    if (this.members.size < this.minDevices) {
      this.emit('swarm:understaffed', { 
        swarmId: this.id, 
        current: this.members.size, 
        required: this.minDevices 
      });
    }
  }

  getMember(deviceId: string): SwarmMember | undefined {
    return this.members.get(deviceId);
  }

  getMembers(): SwarmMember[] {
    return Array.from(this.members.values());
  }

  getLeader(): string | undefined {
    return this.leader;
  }

  // ==================== Coordinated Actions