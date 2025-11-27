/**
 * Swarm Intelligence Module
 * 
 * Enables collective problem-solving through swarm algorithms.
 * Supports formation control, distributed search, and coordinated actions.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Location, Task, TaskPriority } from '../types';

// ==================== Types ====================

export enum SwarmAlgorithm {
  ANT_COLONY = 'ant-colony',
  PARTICLE_SWARM = 'particle-swarm',
  BEES = 'bees',
  FLOCKING = 'flocking',
  CONSENSUS = 'consensus'
}

export enum FormationType {
  LINE = 'line',
  CIRCLE = 'circle',
  WEDGE = 'wedge',
  GRID = 'grid',
  SURROUND = 'surround',
  CONVOY = 'convoy',
  SCATTER = 'scatter'
}

export enum SwarmState {
  FORMING = 'forming',
  READY = 'ready',
  EXECUTING = 'executing',
  DISPERSING = 'dispersing',
  DISSOLVED = 'dissolved'
}

export interface SwarmConfig {
  swarmId: string;
  taskId: string;
  algorithm: SwarmAlgorithm;
  minDevices: number;
  maxDevices?: number;
  leaderId?: string;
  objective: SwarmObjective;
  parameters?: AlgorithmParameters;
  timeout?: number;
}

export interface SwarmObjective {
  type: 'search' | 'transport' | 'coverage' | 'patrol' | 'custom';
  target?: Location | Location[];
  payload?: Record<string, any>;
  successCriteria?: SuccessCriteria;
}

export interface SuccessCriteria {
  minCoverage?: number;        // Percentage of area covered
  targetFound?: boolean;       // For search objectives
  allDelivered?: boolean;      // For transport objectives
  timeLimit?: number;          // Max execution time
  customValidator?: string;    // Custom validation function name
}

export interface AlgorithmParameters {
  // Ant Colony
  pheromoneDecay?: number;
  explorationRate?: number;
  
  // Particle Swarm
  inertiaWeight?: number;
  cognitiveWeight?: number;
  socialWeight?: number;
  
  // Flocking
  separationDistance?: number;
  alignmentWeight?: number;
  cohesionWeight?: number;
  
  // General
  communicationRange?: number;
  updateInterval?: number;
}

export interface SwarmMember {
  deviceId: string;
  role: 'leader' | 'member' | 'scout' | 'carrier';
  location: Location;
  velocity?: { vx: number; vy: number; vz?: number };
  state: 'active' | 'waiting' | 'busy' | 'offline';
  assignedSector?: number;
  lastUpdate: number;
  contribution: number;  // Contribution score to swarm objective
}

export interface PheromoneTrail {
  id: string;
  path: Location[];
  strength: number;
  type: 'success' | 'danger' | 'resource' | 'explored';
  createdBy: string;
  createdAt: number;
  expiresAt: number;
}

export interface SwarmMessage {
  id: string;
  type: 'broadcast' | 'direct' | 'leader' | 'emergency';
  from: string;
  to?: string;
  content: any;
  timestamp: number;
  ttl: number;  // Time to live in hops
}

export interface CoordinatedAction {
  actionId: string;
  type: string;
  target: Location;
  formation: FormationType;
  participants: string[];
  timing: 'synchronized' | 'sequential' | 'adaptive';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime?: number;
  completedBy: string[];
}

export interface SwarmMetrics {
  swarmId: string;
  memberCount: number;
  coverage: number;
  efficiency: number;
  messagesExchanged: number;
  objectiveProgress: number;
  averageContribution: number;
  formationAccuracy: number;
  timestamp: number;
}

// ==================== Swarm Class ====================

export class Swarm extends EventEmitter {
  readonly id: string;
  readonly taskId: string;
  private config: SwarmConfig;
  private members: Map<string, SwarmMember> = new Map();
  private pheromones: Map<string, PheromoneTrail> = new Map();
  private messages: SwarmMessage[] = [];
  private actions: Map<string, CoordinatedAction> = new Map();
  private state: SwarmState = SwarmState.FORMING;
  private leaderId?: string;
  private sectors: Map<number, string[]> = new Map();
  private sharedKnowledge: Map<string, any> = new Map();
  private formationPositions: Map<string, Location> = new Map();
  private metrics: SwarmMetrics;

  constructor(config: SwarmConfig) {
    super();
    this.id = config.swarmId;
    this.taskId = config.taskId;
    this.config = config;
    this.leaderId = config.leaderId;
    this.metrics = this.initializeMetrics();

    // Start pheromone decay timer
    this.startPheromoneDecay();
  }

  // ==================== Member Management ====================

  async join(deviceId: string, location: Location, role?: 'leader' | 'member' | 'scout' | 'carrier'): Promise<boolean> {
    if (this.state === SwarmState.DISSOLVED) {
      return false;
    }

    if (this.config.maxDevices && this.members.size >= this.config.maxDevices) {
      return false;
    }

    const member: SwarmMember = {
      deviceId,
      role: role || (this.members.size === 0 ? 'leader' : 'member'),
      location,
      velocity: { vx: 0, vy: 0 },
      state: 'active',
      lastUpdate: Date.now(),
      contribution: 0
    };

    this.members.set(deviceId, member);

    // First member becomes leader if no leader specified
    if (!this.leaderId && this.members.size === 1) {
      this.leaderId = deviceId;
      member.role = 'leader';
    }

    // Check if swarm is ready
    if (this.state === SwarmState.FORMING && this.members.size >= this.config.minDevices) {
      this.state = SwarmState.READY;
      this.emit('swarm:ready', { swarmId: this.id, memberCount: this.members.size });
    }

    this.emit('member:joined', member);
    this.updateMetrics();

    return true;
  }

  leave(deviceId: string): void {
    const member = this.members.get(deviceId);
    if (!member) return;

    this.members.delete(deviceId);

    // Elect new leader if leader left
    if (deviceId === this.leaderId && this.members.size > 0) {
      this.electNewLeader();
    }

    // Check if swarm should dissolve
    if (this.members.size < this.config.minDevices) {
      if (this.state === SwarmState.EXECUTING) {
        this.emit('swarm:understaffed', { 
          swarmId: this.id, 
          current: this.members.size, 
          required: this.config.minDevices 
        });
      }
    }

    this.emit('member:left', { deviceId, swarmId: this.id });
    this.updateMetrics();
  }

  updateMemberLocation(deviceId: string, location: Location, velocity?: { vx: number; vy: number }): void {
    const member = this.members.get(deviceId);
    if (!member) return;

    member.location = location;
    if (velocity) {
      member.velocity = velocity;
    }
    member.lastUpdate = Date.now();

    this.emit('member:updated', { deviceId, location, velocity });
  }

  // ==================== Coordinated Actions ====================

  async coordinatedAction(
    type: string,
    target: Location,
    options: {
      formation?: FormationType;
      timing?: 'synchronized' | 'sequential' | 'adaptive';
      participants?: string[];
      timeout?: number;
    } = {}
  ): Promise<CoordinatedAction> {
    if (this.state !== SwarmState.READY && this.state !== SwarmState.EXECUTING) {
      throw new Error('Swarm not ready for coordinated actions');
    }

    this.state = SwarmState.EXECUTING;

    const participants = options.participants || Array.from(this.members.keys());
    const formation = options.formation || FormationType.CIRCLE;

    const action: CoordinatedAction = {
      actionId: uuidv4(),
      type,
      target,
      formation,
      participants,
      timing: options.timing || 'synchronized',
      status: 'pending',
      completedBy: []
    };

    this.actions.set(action.actionId, action);

    // Calculate formation positions
    const positions = this.calculateFormationPositions(target, formation, participants.length);
    
    // Assign positions to participants
    participants.forEach((deviceId, index) => {
      this.formationPositions.set(deviceId, positions[index]);
    });

    // Broadcast action to all participants
    await this.broadcast({
      type: 'coordinated-action',
      actionId: action.actionId,
      target,
      formation,
      positions: Object.fromEntries(
        participants.map((id, i) => [id, positions[i]])
      )
    });

    action.status = 'executing';
    action.startTime = Date.now();

    this.emit('action:started', action);

    // Set timeout if specified
    if (options.timeout) {
      setTimeout(() => {
        if (action.status === 'executing') {
          action.status = 'failed';
          this.emit('action:timeout', action);
        }
      }, options.timeout);
    }

    return action;
  }

  reportActionComplete(deviceId: string, actionId: string, success: boolean): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    if (success && !action.completedBy.includes(deviceId)) {
      action.completedBy.push(deviceId);

      const member = this.members.get(deviceId);
      if (member) {
        member.contribution += 10;
      }
    }

    // Check if all participants completed
    if (action.completedBy.length === action.participants.length) {
      action.status = 'completed';
      this.emit('action:completed', action);
    }

    this.updateMetrics();
  }

  // ==================== Formation Control ====================

  private calculateFormationPositions(center: Location, formation: FormationType, count: number): Location[] {
    const positions: Location[] = [];
    const spacing = 5; // Base spacing between units

    switch (formation) {
      case FormationType.CIRCLE:
        for (let i = 0; i < count; i++) {
          const angle = (2 * Math.PI * i) / count;
          const radius = spacing * Math.max(1, count / 4);
          positions.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
            z: center.z
          });
        }
        break;

      case FormationType.LINE:
        const lineStart = center.x - (spacing * (count - 1)) / 2;
        for (let i = 0; i < count; i++) {
          positions.push({
            x: lineStart + spacing * i,
            y: center.y,
            z: center.z
          });
        }
        break;

      case FormationType.WEDGE:
        positions.push({ ...center }); // Leader at front
        for (let i = 1; i < count; i++) {
          const row = Math.ceil(i / 2);
          const side = i % 2 === 0 ? 1 : -1;
          positions.push({
            x: center.x - row * spacing,
            y: center.y + side * row * spacing * 0.5,
            z: center.z
          });
        }
        break;

      case FormationType.GRID:
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const gridStartX = center.x - (spacing * (cols - 1)) / 2;
        const gridStartY = center.y - (spacing * (rows - 1)) / 2;
        
        for (let i = 0; i < count; i++) {
          positions.push({
            x: gridStartX + (i % cols) * spacing,
            y: gridStartY + Math.floor(i / cols) * spacing,
            z: center.z
          });
        }
        break;

      case FormationType.SURROUND:
        // Multiple concentric circles
        let placed = 0;
        let ring = 1;
        while (placed < count) {
          const ringCount = Math.min(count - placed, ring * 6);
          for (let i = 0; i < ringCount; i++) {
            const angle = (2 * Math.PI * i) / ringCount;
            const radius = spacing * ring;
            positions.push({
              x: center.x + radius * Math.cos(angle),
              y: center.y + radius * Math.sin(angle),
              z: center.z
            });
            placed++;
          }
          ring++;
        }
        break;

      case FormationType.CONVOY:
        for (let i = 0; i < count; i++) {
          positions.push({
            x: center.x - spacing * i,
            y: center.y,
            z: center.z
          });
        }
        break;

      case FormationType.SCATTER:
        // Random positions within radius
        const scatterRadius = spacing * Math.sqrt(count);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const r = Math.random() * scatterRadius;
          positions.push({
            x: center.x + r * Math.cos(angle),
            y: center.y + r * Math.sin(angle),
            z: center.z
          });
        }
        break;
    }

    return positions;
  }

  getFormationPosition(deviceId: string): Location | undefined {
    return this.formationPositions.get(deviceId);
  }

  getFormationAccuracy(): number {
    let totalDistance = 0;
    let count = 0;

    for (const [deviceId, targetPos] of this.formationPositions) {
      const member = this.members.get(deviceId);
      if (member) {
        const distance = this.calculateDistance(member.location, targetPos);
        totalDistance += distance;
        count++;
      }
    }

    if (count === 0) return 0;

    // Convert to accuracy percentage (closer = higher accuracy)
    const avgDistance = totalDistance / count;
    const maxAcceptableDistance = 10;
    return Math.max(0, 1 - avgDistance / maxAcceptableDistance) * 100;
  }

  // ==================== Swarm Algorithms ====================

  async executeAlgorithm(): Promise<void> {
    switch (this.config.algorithm) {
      case SwarmAlgorithm.ANT_COLONY:
        await this.executeAntColony();
        break;
      case SwarmAlgorithm.PARTICLE_SWARM:
        await this.executeParticleSwarm();
        break;
      case SwarmAlgorithm.FLOCKING:
        await this.executeFlocking();
        break;
      case SwarmAlgorithm.BEES:
        await this.executeBeeAlgorithm();
        break;
      case SwarmAlgorithm.CONSENSUS:
        await this.executeConsensus();
        break;
    }
  }

  private async executeAntColony(): Promise<void> {
    const params = this.config.parameters || {};
    const explorationRate = params.explorationRate || 0.3;

    for (const [deviceId, member] of this.members) {
      // Decide: explore or exploit
      const shouldExplore = Math.random() < explorationRate;

      if (shouldExplore) {
        // Random exploration
        const direction = Math.random() * 2 * Math.PI;
        const distance = 5 + Math.random() * 10;
        
        const newLocation: Location = {
          x: member.location.x + distance * Math.cos(direction),
          y: member.location.y + distance * Math.sin(direction)
        };

        this.emit('movement:suggested', { deviceId, target: newLocation, reason: 'exploration' });
      } else {
        // Follow pheromone trails
        const nearbyTrails = this.findNearbyPheromones(member.location, 20);
        if (nearbyTrails.length > 0) {
          // Probabilistic selection based on trail strength
          const totalStrength = nearbyTrails.reduce((sum, t) => sum + t.strength, 0);
          let selection = Math.random() * totalStrength;
          
          for (const trail of nearbyTrails) {
            selection -= trail.strength;
            if (selection <= 0) {
              // Follow this trail
              const nextPoint = trail.path[1] || trail.path[0];
              this.emit('movement:suggested', { 
                deviceId, 
                target: nextPoint, 
                reason: 'following-pheromone',
                trailId: trail.id 
              });
              break;
            }
          }
        }
      }
    }
  }

  private async executeParticleSwarm(): Promise<void> {
    const params = this.config.parameters || {};
    const inertia = params.inertiaWeight || 0.7;
    const cognitive = params.cognitiveWeight || 1.5;
    const social = params.socialWeight || 1.5;

    // Get global best position (from shared knowledge)
    const globalBest = this.sharedKnowledge.get('globalBest') as Location;

    for (const [deviceId, member] of this.members) {
      const personalBest = this.sharedKnowledge.get(`personalBest:${deviceId}`) as Location || member.location;

      if (member.velocity && globalBest) {
        // Update velocity
        const r1 = Math.random();
        const r2 = Math.random();

        const newVx = inertia * member.velocity.vx +
          cognitive * r1 * (personalBest.x - member.location.x) +
          social * r2 * (globalBest.x - member.location.x);

        const newVy = inertia * member.velocity.vy +
          cognitive * r1 * (personalBest.y - member.location.y) +
          social * r2 * (globalBest.y - member.location.y);

        // Limit velocity
        const maxVelocity = 10;
        const speed = Math.sqrt(newVx * newVx + newVy * newVy);
        const scale = speed > maxVelocity ? maxVelocity / speed : 1;

        member.velocity = {
          vx: newVx * scale,
          vy: newVy * scale
        };

        // Suggest new position
        const newLocation: Location = {
          x: member.location.x + member.velocity.vx,
          y: member.location.y + member.velocity.vy
        };

        this.emit('movement:suggested', { deviceId, target: newLocation, velocity: member.velocity });
      }
    }
  }

  private async executeFlocking(): Promise<void> {
    const params = this.config.parameters || {};
    const separationDist = params.separationDistance || 5;
    const alignmentWeight = params.alignmentWeight || 1;
    const cohesionWeight = params.cohesionWeight || 1;

    for (const [deviceId, member] of this.members) {
      const neighbors = this.getNeighbors(deviceId, 30);
      if (neighbors.length === 0) continue;

      // Separation: avoid crowding
      let separationX = 0, separationY = 0;
      for (const neighbor of neighbors) {
        const dist = this.calculateDistance(member.location, neighbor.location);
        if (dist < separationDist && dist > 0) {
          separationX += (member.location.x - neighbor.location.x) / dist;
          separationY += (member.location.y - neighbor.location.y) / dist;
        }
      }

      // Alignment: steer towards average heading
      let avgVx = 0, avgVy = 0;
      for (const neighbor of neighbors) {
        if (neighbor.velocity) {
          avgVx += neighbor.velocity.vx;
          avgVy += neighbor.velocity.vy;
        }
      }
      avgVx /= neighbors.length;
      avgVy /= neighbors.length;

      // Cohesion: steer towards center of mass
      let centerX = 0, centerY = 0;
      for (const neighbor of neighbors) {
        centerX += neighbor.location.x;
        centerY += neighbor.location.y;
      }
      centerX /= neighbors.length;
      centerY /= neighbors.length;

      const cohesionX = centerX - member.location.x;
      const cohesionY = centerY - member.location.y;

      // Combine forces
      const newVx = separationX + alignmentWeight * avgVx + cohesionWeight * cohesionX * 0.1;
      const newVy = separationY + alignmentWeight * avgVy + cohesionWeight * cohesionY * 0.1;

      // Normalize and scale
      const speed = Math.sqrt(newVx * newVx + newVy * newVy);
      const maxSpeed = 5;
      const scale = speed > 0 ? Math.min(maxSpeed / speed, 1) : 0;

      member.velocity = {
        vx: newVx * scale,
        vy: newVy * scale
      };

      const newLocation: Location = {
        x: member.location.x + member.velocity.vx,
        y: member.location.y + member.velocity.vy
      };

      this.emit('movement:suggested', { deviceId, target: newLocation, velocity: member.velocity });
    }
  }

  private async executeBeeAlgorithm(): Promise<void> {
    const members = Array.from(this.members.values());
    const scoutCount = Math.ceil(members.length * 0.3);
    
    // Assign roles
    const scouts = members.slice(0, scoutCount);
    const workers = members.slice(scoutCount);

    // Scouts explore randomly
    for (const scout of scouts) {
      const direction = Math.random() * 2 * Math.PI;
      const distance = 10 + Math.random() * 20;
      
      const newLocation: Location = {
        x: scout.location.x + distance * Math.cos(direction),
        y: scout.location.y + distance * Math.sin(direction)
      };

      scout.role = 'scout';
      this.emit('movement:suggested', { 
        deviceId: scout.deviceId, 
        target: newLocation, 
        reason: 'scouting' 
      });
    }

    // Workers go to known good locations
    const foodSources = Array.from(this.sharedKnowledge.entries())
      .filter(([key]) => key.startsWith('foodSource:'))
      .map(([, value]) => value as { location: Location; quality: number });

    if (foodSources.length > 0) {
      for (const worker of workers) {
        // Probabilistic selection based on quality
        const totalQuality = foodSources.reduce((sum, f) => sum + f.quality, 0);
        let selection = Math.random() * totalQuality;
        
        for (const source of foodSources) {
          selection -= source.quality;
          if (selection <= 0) {
            worker.role = 'carrier';
            this.emit('movement:suggested', { 
              deviceId: worker.deviceId, 
              target: source.location, 
              reason: 'harvesting' 
            });
            break;
          }
        }
      }
    }
  }

  private async executeConsensus(): Promise<void> {
    // Distributed consensus algorithm
    const members = Array.from(this.members.values());
    
    // Calculate average position (consensus target)
    let avgX = 0, avgY = 0;
    for (const member of members) {
      avgX += member.location.x;
      avgY += member.location.y;
    }
    avgX /= members.length;
    avgY /= members.length;

    const consensusTarget: Location = { x: avgX, y: avgY };

    // Each member moves towards consensus with some weight
    for (const member of members) {
      const moveX = (consensusTarget.x - member.location.x) * 0.1;
      const moveY = (consensusTarget.y - member.location.y) * 0.1;

      const newLocation: Location = {
        x: member.location.x + moveX,
        y: member.location.y + moveY
      };

      this.emit('movement:suggested', { 
        deviceId: member.deviceId, 
        target: newLocation, 
        reason: 'consensus' 
      });
    }

    this.sharedKnowledge.set('consensusTarget', consensusTarget);
  }

  // ==================== Pheromone System ====================

  depositPheromone(
    deviceId: string,
    path: Location[],
    type: 'success' | 'danger' | 'resource' | 'explored',
    strength: number = 1.0
  ): PheromoneTrail {
    const decay = this.config.parameters?.pheromoneDecay || 0.1;
    const lifetime = 60000; // 1 minute

    const trail: PheromoneTrail = {
      id: uuidv4(),
      path,
      strength,
      type,
      createdBy: deviceId,
      createdAt: Date.now(),
      expiresAt: Date.now() + lifetime
    };

    this.pheromones.set(trail.id, trail);
    this.emit('pheromone:deposited', trail);

    // Increase contributor's contribution
    const member = this.members.get(deviceId);
    if (member) {
      member.contribution += 5;
    }

    return trail;
  }

  private findNearbyPheromones(location: Location, radius: number): PheromoneTrail[] {
    const nearby: PheromoneTrail[] = [];

    for (const trail of this.pheromones.values()) {
      // Check if any point on the trail is within radius
      for (const point of trail.path) {
        if (this.calculateDistance(location, point) <= radius) {
          nearby.push(trail);
          break;
        }
      }
    }

    return nearby.sort((a, b) => b.strength - a.strength);
  }

  private startPheromoneDecay(): void {
    const decayInterval = 5000; // Every 5 seconds
    const decayRate = this.config.parameters?.pheromoneDecay || 0.1;

    setInterval(() => {
      const now = Date.now();
      
      for (const [id, trail] of this.pheromones) {
        // Remove expired trails
        if (now > trail.expiresAt) {
          this.pheromones.delete(id);
          this.emit('pheromone:expired', { trailId: id });
          continue;
        }

        // Decay strength
        trail.strength *= (1 - decayRate);
        
        if (trail.strength < 0.01) {
          this.pheromones.delete(id);
          this.emit('pheromone:faded', { trailId: id });
        }
      }
    }, decayInterval);
  }

  // ==================== Communication ====================

  async broadcast(content: any, type: 'broadcast' | 'leader' | 'emergency' = 'broadcast'): Promise<void> {
    const message: SwarmMessage = {
      id: uuidv4(),
      type,
      from: this.leaderId || 'swarm',
      content,
      timestamp: Date.now(),
      ttl: 3
    };

    this.messages.push(message);
    this.metrics.messagesExchanged++;

    this.emit('message:broadcast', message);
  }

  async sendDirect(to: string, content: any): Promise<void> {
    const message: SwarmMessage = {
      id: uuidv4(),
      type: 'direct',
      from: this.leaderId || 'swarm',
      to,
      content,
      timestamp: Date.now(),
      ttl: 1
    };

    this.messages.push(message);
    this.metrics.messagesExchanged++;

    this.emit('message:direct', message);
  }

  shareKnowledge(key: string, value: any): void {
    this.sharedKnowledge.set(key, value);
    this.emit('knowledge:shared', { key, value });
  }

  getSharedKnowledge(key: string): any {
    return this.sharedKnowledge.get(key);
  }

  // ==================== Sector Management ====================

  assignSectors(areaSize: { width: number; height: number }): void {
    const memberCount = this.members.size;
    const sectorsPerSide = Math.ceil(Math.sqrt(memberCount));
    const sectorWidth = areaSize.width / sectorsPerSide;
    const sectorHeight = areaSize.height / sectorsPerSide;

    let sectorIndex = 0;
    for (const [deviceId, member] of this.members) {
      member.assignedSector = sectorIndex;
      
      if (!this.sectors.has(sectorIndex)) {
        this.sectors.set(sectorIndex, []);
      }
      this.sectors.get(sectorIndex)!.push(deviceId);

      // Emit sector assignment with bounds
      const col = sectorIndex % sectorsPerSide;
      const row = Math.floor(sectorIndex / sectorsPerSide);

      this.emit('sector:assigned', {
        deviceId,
        sector: sectorIndex,
        bounds: {
          minX: col * sectorWidth,
          maxX: (col + 1) * sectorWidth,
          minY: row * sectorHeight,
          maxY: (row + 1) * sectorHeight
        }
      });

      sectorIndex++;
    }
  }

  // ==================== Lifecycle ====================

  async dissolve(): Promise<void> {
    this.state = SwarmState.DISPERSING;
    
    await this.broadcast({
      type: 'dissolve',
      reason: 'mission-complete'
    });

    this.state = SwarmState.DISSOLVED;
    this.emit('swarm:dissolved', { swarmId: this.id });
  }

  getState(): SwarmState {
    return this.state;
  }

  getMembers(): SwarmMember[] {
    return Array.from(this.members.values());
  }

  getMember(deviceId: string): SwarmMember | undefined {
    return this.members.get(deviceId);
  }

  getLeader(): string | undefined {
    return this.leaderId;
  }

  // ==================== Private Helpers ====================

  private electNewLeader(): void {
    // Elect member with highest contribution
    let bestCandidate: SwarmMember | undefined;
    let highestContribution = -1;

    for (const member of this.members.values()) {
      if (member.contribution > highestContribution) {
        highestContribution = member.contribution;
        bestCandidate = member;
      }
    }

    if (bestCandidate) {
      this.leaderId = bestCandidate.deviceId;
      bestCandidate.role = 'leader';
      this.emit('leader:elected', { deviceId: this.leaderId });
    }
  }

  private getNeighbors(deviceId: string, radius: number): SwarmMember[] {
    const member = this.members.get(deviceId);
    if (!member) return [];

    const neighbors: SwarmMember[] = [];
    for (const [id, other] of this.members) {
      if (id !== deviceId) {
        const distance = this.calculateDistance(member.location, other.location);
        if (distance <= radius) {
          neighbors.push(other);
        }
      }
    }

    return neighbors;
  }

  private calculateDistance(a: Location, b: Location): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z || 0) - (a.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private initializeMetrics(): SwarmMetrics {
    return {
      swarmId: this.id,
      memberCount: 0,
      coverage: 0,
      efficiency: 0,
      messagesExchanged: 0,
      objectiveProgress: 0,
      averageContribution: 0,
      formationAccuracy: 0,
      timestamp: Date.now()
    };
  }

  private updateMetrics(): void {
    const members = Array.from(this.members.values());
    
    this.metrics = {
      swarmId: this.id,
      memberCount: members.length,
      coverage: this.calculateCoverage(),
      efficiency: this.calculateEfficiency(),
      messagesExchanged: this.metrics.messagesExchanged,
      objectiveProgress: this.calculateObjectiveProgress(),
      averageContribution: members.length > 0 
        ? members.reduce((sum, m) => sum + m.contribution, 0) / members.length 
        : 0,
      formationAccuracy: this.getFormationAccuracy(),
      timestamp: Date.now()
    };

    this.emit('metrics:updated', this.metrics);
  }

  private calculateCoverage(): number {
    // Simplified coverage calculation based on member spread
    const members = Array.from(this.members.values());
    if (members.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalDistance += this.calculateDistance(members[i].location, members[j].location);
      }
    }

    const avgDistance = totalDistance / (members.length * (members.length - 1) / 2);
    return Math.min(avgDistance / 50 * 100, 100); // Normalize to 0-100
  }

  private calculateEfficiency(): number {
    const members = Array.from(this.members.values());
    if (members.length === 0) return 0;

    const activeMembers = members.filter(m => m.state === 'active').length;
    const avgContribution = members.reduce((sum, m) => sum + m.contribution, 0) / members.length;

    return (activeMembers / members.length * 50) + Math.min(avgContribution, 50);
  }

  private calculateObjectiveProgress(): number {
    // Override in specific implementations
    const completedActions = Array.from(this.actions.values())
      .filter(a => a.status === 'completed').length;
    const totalActions = this.actions.size;

    if (totalActions === 0) return 0;
    return (completedActions / totalActions) * 100;
  }

  getMetrics(): SwarmMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
}

// ==================== Swarm Intelligence Module ====================

export interface SwarmIntelligenceConfig {
  deviceId: string;
  maxSwarms?: number;
  defaultAlgorithm?: SwarmAlgorithm;
}

export class SwarmIntelligence extends EventEmitter {
  private deviceId: string;
  private swarms: Map<string, Swarm> = new Map();
  private maxSwarms: number;
  private defaultAlgorithm: SwarmAlgorithm;

  constructor(config: SwarmIntelligenceConfig) {
    super();
    this.deviceId = config.deviceId;
    this.maxSwarms = config.maxSwarms || 5;
    this.defaultAlgorithm = config.defaultAlgorithm || SwarmAlgorithm.ANT_COLONY;
  }

  async formSwarm(params: {
    taskId: string;
    minDevices: number;
    maxDevices?: number;
    algorithm?: SwarmAlgorithm;
    objective: SwarmObjective;
    parameters?: AlgorithmParameters;
    timeout?: number;
  }): Promise<Swarm> {
    if (this.swarms.size >= this.maxSwarms) {
      throw new Error('Maximum swarm limit reached');
    }

    const swarmId = uuidv4();
    const config: SwarmConfig = {
      swarmId,
      taskId: params.taskId,
      algorithm: params.algorithm || this.defaultAlgorithm,
      minDevices: params.minDevices,
      maxDevices: params.maxDevices,
      leaderId: this.deviceId,
      objective: params.objective,
      parameters: params.parameters,
      timeout: params.timeout
    };

    const swarm = new Swarm(config);
    this.swarms.set(swarmId, swarm);

    // Forward swarm events
    this.forwardSwarmEvents(swarm);

    this.emit('swarm:formed', { swarmId, config });

    return swarm;
  }

  async joinSwarm(swarmId: string, location: Location): Promise<boolean> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      // Try to find swarm from network (would be implemented with actual networking)
      return false;
    }

    return swarm.join(this.deviceId, location);
  }

  async leaveSwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (swarm) {
      swarm.leave(this.deviceId);
    }
  }

  getSwarm(swarmId: string): Swarm | undefined {
    return this.swarms.get(swarmId);
  }

  getActiveSwarms(): Swarm[] {
    return Array.from(this.swarms.values())
      .filter(s => s.getState() !== SwarmState.DISSOLVED);
  }

  async dissolveSwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (swarm) {
      await swarm.dissolve();
      this.swarms.delete(swarmId);
    }
  }

  private forwardSwarmEvents(swarm: Swarm): void {
    const events = [
      'swarm:ready', 'swarm:dissolved', 'swarm:understaffed',
      'member:joined', 'member:left', 'member:updated',
      'action:started', 'action:completed', 'action:timeout',
      'movement:suggested', 'pheromone:deposited',
      'message:broadcast', 'message:direct',
      'leader:elected', 'sector:assigned', 'metrics:updated'
    ];

    for (const event of events) {
      swarm.on(event, (data) => {
        this.emit(event, { ...data, swarmId: swarm.id });
      });
    }
  }
}

export default SwarmIntelligence;
