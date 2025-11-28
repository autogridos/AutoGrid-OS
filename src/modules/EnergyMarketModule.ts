import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

export enum EnergySourceType {
  CHARGING_STATION = 'charging_station',
  SOLAR_PANEL = 'solar_panel',
  BATTERY_SWAP = 'battery_swap',
  WIRELESS_CHARGING = 'wireless_charging',
  PEER_TRANSFER = 'peer_transfer'
}

export enum EnergyOrderStatus {
  OPEN = 'open',
  MATCHED = 'matched',
  CHARGING = 'charging',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ChargingStationStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline'
}

export interface EnergySource {
  id: string;
  ownerId: string;
  type: EnergySourceType;
  location: { x: number; y: number; z?: number };
  capacity: number;
  currentOutput: number;
  pricePerKwh: number;
  status: ChargingStationStatus;
  connectorTypes: string[];
  maxChargingPower: number;
  queueLength: number;
  rating: number;
  totalSessions: number;
  metadata?: Record<string, any>;
}

export interface EnergyOrder {
  id: string;
  deviceId: string;
  type: 'buy' | 'sell';
  status: EnergyOrderStatus;
  energyAmount: number;
  maxPricePerKwh?: number;
  minPricePerKwh?: number;
  preferredSourceTypes?: EnergySourceType[];
  location: { x: number; y: number };
  maxDistance?: number;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  currentBatteryLevel: number;
  targetBatteryLevel: number;
  deadline?: number;
  createdAt: number;
  matchedSourceId?: string;
  matchedAt?: number;
  completedAt?: number;
}

export interface ChargingSession {
  id: string;
  orderId: string;
  sourceId: string;
  deviceId: string;
  startTime: number;
  endTime?: number;
  energyDelivered: number;
  totalCost: number;
  averagePower: number;
  peakPower: number;
  efficiency: number;
  status: 'active' | 'completed' | 'interrupted' | 'failed';
}

export interface EnergyReservation {
  id: string;
  sourceId: string;
  deviceId: string;
  startTime: number;
  endTime: number;
  estimatedEnergy: number;
  depositAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show';
}

export interface EnergyMarketStats {
  totalEnergySold: number;
  totalEnergyBought: number;
  totalTransactions: number;
  averagePricePerKwh: number;
  peakDemandTime?: number;
  lowDemandTime?: number;
  gridEfficiency: number;
}

export interface PeerEnergyTransfer {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  energyAmount: number;
  transferRate: number;
  pricePerKwh: number;
  status: 'negotiating' | 'transferring' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  efficiency: number;
}

export interface EnergyForecast {
  deviceId: string;
  timestamp: number;
  predictedConsumption: number;
  predictedGeneration: number;
  recommendedChargeTime?: number;
  priceForecasts: Array<{ time: number; price: number }>;
}

interface EnergyModuleConfig {
  deviceId: string;
  batteryCapacity: number;
  currentCharge: number;
  chargingEfficiency?: number;
  canTransferEnergy?: boolean;
  maxTransferRate?: number;
}

export class EnergyMarketModule extends EventEmitter {
  private deviceId: string;
  private batteryCapacity: number;
  private currentCharge: number;
  private chargingEfficiency: number;
  private canTransferEnergy: boolean;
  private maxTransferRate: number;

  private energySources: Map<string, EnergySource> = new Map();
  private orders: Map<string, EnergyOrder> = new Map();
  private sessions: Map<string, ChargingSession> = new Map();
  private reservations: Map<string, EnergyReservation> = new Map();
  private peerTransfers: Map<string, PeerEnergyTransfer> = new Map();
  private priceHistory: Array<{ timestamp: number; price: number }> = [];
  private consumptionHistory: Array<{ timestamp: number; amount: number }> = [];

  constructor(config: EnergyModuleConfig) {
    super();
    this.deviceId = config.deviceId;
    this.batteryCapacity = config.batteryCapacity;
    this.currentCharge = config.currentCharge;
    this.chargingEfficiency = config.chargingEfficiency || 0.95;
    this.canTransferEnergy = config.canTransferEnergy || false;
    this.maxTransferRate = config.maxTransferRate || 10; // kW
  }

  // === Energy Source Management ===

  registerEnergySource(params: {
    type: EnergySourceType;
    location: { x: number; y: number; z?: number };
    capacity: number;
    pricePerKwh: number;
    connectorTypes: string[];
    maxChargingPower: number;
    metadata?: Record<string, any>;
  }): EnergySource {
    const source: EnergySource = {
      id: uuidv4(),
      ownerId: this.deviceId,
      type: params.type,
      location: params.location,
      capacity: params.capacity,
      currentOutput: 0,
      pricePerKwh: params.pricePerKwh,
      status: ChargingStationStatus.AVAILABLE,
      connectorTypes: params.connectorTypes,
      maxChargingPower: params.maxChargingPower,
      queueLength: 0,
      rating: 5.0,
      totalSessions: 0,
      metadata: params.metadata
    };

    this.energySources.set(source.id, source);
    this.emit('source:registered', source);

    return source;
  }

  updateSourceStatus(sourceId: string, status: ChargingStationStatus): void {
    const source = this.energySources.get(sourceId);
    if (!source) throw new Error('Energy source not found');
    if (source.ownerId !== this.deviceId) throw new Error('Not authorized');

    source.status = status;
    this.emit('source:status_changed', { sourceId, status });
  }

  updateSourcePrice(sourceId: string, pricePerKwh: number): void {
    const source = this.energySources.get(sourceId);
    if (!source) throw new Error('Energy source not found');
    if (source.ownerId !== this.deviceId) throw new Error('Not authorized');

    const oldPrice = source.pricePerKwh;
    source.pricePerKwh = pricePerKwh;

    this.priceHistory.push({ timestamp: Date.now(), price: pricePerKwh });
    this.emit('source:price_changed', { sourceId, oldPrice, newPrice: pricePerKwh });
  }

  // === Order Management ===

  createBuyOrder(params: {
    energyAmount: number;
    maxPricePerKwh: number;
    preferredSourceTypes?: EnergySourceType[];
    location: { x: number; y: number };
    maxDistance?: number;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
    targetBatteryLevel?: number;
    deadline?: number;
  }): EnergyOrder {
    const order: EnergyOrder = {
      id: uuidv4(),
      deviceId: this.deviceId,
      type: 'buy',
      status: EnergyOrderStatus.OPEN,
      energyAmount: params.energyAmount,
      maxPricePerKwh: params.maxPricePerKwh,
      preferredSourceTypes: params.preferredSourceTypes,
      location: params.location,
      maxDistance: params.maxDistance,
      urgency: params.urgency || 'normal',
      currentBatteryLevel: (this.currentCharge / this.batteryCapacity) * 100,
      targetBatteryLevel: params.targetBatteryLevel || 80,
      deadline: params.deadline,
      createdAt: Date.now()
    };

    this.orders.set(order.id, order);
    this.emit('order:created', order);

    // Auto-match if urgent
    if (order.urgency === 'critical' || order.urgency === 'high') {
      this.tryMatchOrder(order.id);
    }

    return order;
  }

  createSellOrder(params: {
    sourceId: string;
    energyAmount: number;
    minPricePerKwh: number;
  }): EnergyOrder {
    const source = this.energySources.get(params.sourceId);
    if (!source) throw new Error('Energy source not found');
    if (source.ownerId !== this.deviceId) throw new Error('Not authorized');

    const order: EnergyOrder = {
      id: uuidv4(),
      deviceId: this.deviceId,
      type: 'sell',
      status: EnergyOrderStatus.OPEN,
      energyAmount: params.energyAmount,
      minPricePerKwh: params.minPricePerKwh,
      location: source.location,
      urgency: 'normal',
      currentBatteryLevel: 100,
      targetBatteryLevel: 100,
      createdAt: Date.now(),
      matchedSourceId: params.sourceId
    };

    this.orders.set(order.id, order);
    this.emit('order:created', order);

    return order;
  }

  cancelOrder(orderId: string): void {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.deviceId !== this.deviceId) throw new Error('Not authorized');
    if (order.status !== EnergyOrderStatus.OPEN) {
      throw new Error('Cannot cancel order in current status');
    }

    order.status = EnergyOrderStatus.CANCELLED;
    this.emit('order:cancelled', order);
  }

  // === Order Matching ===

  findAvailableSources(params: {
    location: { x: number; y: number };
    maxDistance?: number;
    minPower?: number;
    sourceTypes?: EnergySourceType[];
    connectorType?: string;
  }): EnergySource[] {
    const sources: EnergySource[] = [];

    for (const source of this.energySources.values()) {
      if (source.status !== ChargingStationStatus.AVAILABLE) continue;

      const distance = this.calculateDistance(params.location, source.location);
      if (params.maxDistance && distance > params.maxDistance) continue;

      if (params.minPower && source.maxChargingPower < params.minPower) continue;

      if (params.sourceTypes && !params.sourceTypes.includes(source.type)) continue;

      if (params.connectorType && !source.connectorTypes.includes(params.connectorType)) continue;

      sources.push(source);
    }

    return sources.sort((a, b) => {
      const distA = this.calculateDistance(params.location, a.location);
      const distB = this.calculateDistance(params.location, b.location);
      const scoreA = a.rating * 0.3 + (1 / a.pricePerKwh) * 0.4 + (1 / distA) * 0.3;
      const scoreB = b.rating * 0.3 + (1 / b.pricePerKwh) * 0.4 + (1 / distB) * 0.3;
      return scoreB - scoreA;
    });
  }

  private tryMatchOrder(orderId: string): EnergySource | null {
    const order = this.orders.get(orderId);
    if (!order || order.type !== 'buy') return null;

    const sources = this.findAvailableSources({
      location: order.location,
      maxDistance: order.maxDistance,
      sourceTypes: order.preferredSourceTypes
    });

    const matchedSource = sources.find(s => 
      s.pricePerKwh <= (order.maxPricePerKwh || Infinity)
    );

    if (matchedSource) {
      order.status = EnergyOrderStatus.MATCHED;
      order.matchedSourceId = matchedSource.id;
      order.matchedAt = Date.now();
      
      this.emit('order:matched', { order, source: matchedSource });
      return matchedSource;
    }

    return null;
  }

  // === Charging Sessions ===

  startChargingSession(orderId: string): ChargingSession {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (!order.matchedSourceId) throw new Error('Order not matched to source');

    const source = this.energySources.get(order.matchedSourceId);
    if (!source) throw new Error('Source not found');

    source.status = ChargingStationStatus.OCCUPIED;
    order.status = EnergyOrderStatus.CHARGING;

    const session: ChargingSession = {
      id: uuidv4(),
      orderId: order.id,
      sourceId: source.id,
      deviceId: order.deviceId,
      startTime: Date.now(),
      energyDelivered: 0,
      totalCost: 0,
      averagePower: 0,
      peakPower: 0,
      efficiency: this.chargingEfficiency,
      status: 'active'
    };

    this.sessions.set(session.id, session);
    this.emit('session:started', session);

    return session;
  }

  updateChargingSession(sessionId: string, params: {
    energyDelivered: number;
    currentPower: number;
  }): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'active') throw new Error('Session not active');

    const source = this.energySources.get(session.sourceId);
    if (!source) throw new Error('Source not found');

    session.energyDelivered = params.energyDelivered;
    session.totalCost = params.energyDelivered * source.pricePerKwh;
    session.peakPower = Math.max(session.peakPower, params.currentPower);

    const duration = (Date.now() - session.startTime) / 3600000; // hours
    session.averagePower = duration > 0 ? session.energyDelivered / duration : 0;

    // Update device charge
    this.currentCharge += params.energyDelivered * this.chargingEfficiency;
    this.currentCharge = Math.min(this.currentCharge, this.batteryCapacity);

    this.emit('session:updated', session);
  }

  completeChargingSession(sessionId: string): ChargingSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const order = this.orders.get(session.orderId);
    const source = this.energySources.get(session.sourceId);

    session.status = 'completed';
    session.endTime = Date.now();

    if (order) {
      order.status = EnergyOrderStatus.COMPLETED;
      order.completedAt = Date.now();
    }

    if (source) {
      source.status = ChargingStationStatus.AVAILABLE;
      source.totalSessions++;
      source.currentOutput = 0;
    }

    this.consumptionHistory.push({
      timestamp: Date.now(),
      amount: session.energyDelivered
    });

    this.emit('session:completed', session);

    return session;
  }

  // === Reservations ===

  createReservation(params: {
    sourceId: string;
    startTime: number;
    duration: number;
    estimatedEnergy: number;
    depositAmount: number;
  }): EnergyReservation {
    const source = this.energySources.get(params.sourceId);
    if (!source) throw new Error('Source not found');

    const reservation: EnergyReservation = {
      id: uuidv4(),
      sourceId: params.sourceId,
      deviceId: this.deviceId,
      startTime: params.startTime,
      endTime: params.startTime + params.duration,
      estimatedEnergy: params.estimatedEnergy,
      depositAmount: params.depositAmount,
      status: 'pending'
    };

    this.reservations.set(reservation.id, reservation);
    this.emit('reservation:created', reservation);

    return reservation;
  }

  confirmReservation(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) throw new Error('Reservation not found');

    reservation.status = 'confirmed';

    const source = this.energySources.get(reservation.sourceId);
    if (source && reservation.startTime <= Date.now()) {
      source.status = ChargingStationStatus.RESERVED;
    }

    this.emit('reservation:confirmed', reservation);
  }

  cancelReservation(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) throw new Error('Reservation not found');

    reservation.status = 'cancelled';
    this.emit('reservation:cancelled', reservation);
  }

  // === Peer-to-Peer Energy Transfer ===

  initiatePeerTransfer(params: {
    toDeviceId: string;
    energyAmount: number;
    pricePerKwh: number;
  }): PeerEnergyTransfer {
    if (!this.canTransferEnergy) {
      throw new Error('Device cannot transfer energy');
    }

    if (this.currentCharge < params.energyAmount) {
      throw new Error('Insufficient energy for transfer');
    }

    const transfer: PeerEnergyTransfer = {
      id: uuidv4(),
      fromDeviceId: this.deviceId,
      toDeviceId: params.toDeviceId,
      energyAmount: params.energyAmount,
      transferRate: this.maxTransferRate,
      pricePerKwh: params.pricePerKwh,
      status: 'negotiating',
      efficiency: 0.9 // P2P transfer typically less efficient
    };

    this.peerTransfers.set(transfer.id, transfer);
    this.emit('peer_transfer:initiated', transfer);

    return transfer;
  }

  acceptPeerTransfer(transferId: string): void {
    const transfer = this.peerTransfers.get(transferId);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.toDeviceId !== this.deviceId) throw new Error('Not authorized');

    transfer.status = 'transferring';
    transfer.startTime = Date.now();

    this.emit('peer_transfer:accepted', transfer);
  }

  completePeerTransfer(transferId: string): PeerEnergyTransfer {
    const transfer = this.peerTransfers.get(transferId);
    if (!transfer) throw new Error('Transfer not found');

    transfer.status = 'completed';
    transfer.endTime = Date.now();

    // Update energy levels
    if (transfer.fromDeviceId === this.deviceId) {
      this.currentCharge -= transfer.energyAmount;
    } else if (transfer.toDeviceId === this.deviceId) {
      this.currentCharge += transfer.energyAmount * transfer.efficiency;
      this.currentCharge = Math.min(this.currentCharge, this.batteryCapacity);
    }

    this.emit('peer_transfer:completed', transfer);

    return transfer;
  }

  // === Energy Forecasting ===

  generateEnergyForecast(hoursAhead: number = 24): EnergyForecast {
    const avgConsumption = this.calculateAverageConsumption();
    const priceForecasts: Array<{ time: number; price: number }> = [];

    const now = Date.now();
    const avgPrice = this.calculateAveragePrice();

    for (let i = 0; i < hoursAhead; i++) {
      const hour = new Date(now + i * 3600000).getHours();
      // Simple price model: higher during peak hours (9-17)
      const peakMultiplier = (hour >= 9 && hour <= 17) ? 1.3 : 0.8;
      priceForecasts.push({
        time: now + i * 3600000,
        price: avgPrice * peakMultiplier
      });
    }

    // Find cheapest time to charge
    const cheapestSlot = priceForecasts.reduce((min, slot) => 
      slot.price < min.price ? slot : min
    );

    return {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      predictedConsumption: avgConsumption * hoursAhead,
      predictedGeneration: 0,
      recommendedChargeTime: cheapestSlot.time,
      priceForecasts
    };
  }

  // === Smart Charging ===

  getSmartChargingRecommendation(): {
    shouldChargeNow: boolean;
    reason: string;
    recommendedSource?: EnergySource;
    estimatedSavings?: number;
  } {
    const batteryPercent = (this.currentCharge / this.batteryCapacity) * 100;
    const forecast = this.generateEnergyForecast(12);
    const currentPrice = this.calculateAveragePrice();

    // Critical battery - charge now
    if (batteryPercent < 15) {
      const sources = this.findAvailableSources({
        location: { x: 0, y: 0 },
        maxDistance: 1000
      });

      return {
        shouldChargeNow: true,
        reason: 'Critical battery level',
        recommendedSource: sources[0]
      };
    }

    // Check if current price is good
    const futureAvgPrice = forecast.priceForecasts.reduce((sum, p) => sum + p.price, 0) / 
                          forecast.priceForecasts.length;

    if (currentPrice < futureAvgPrice * 0.85 && batteryPercent < 60) {
      const sources = this.findAvailableSources({
        location: { x: 0, y: 0 },
        maxDistance: 500
      });

      return {
        shouldChargeNow: true,
        reason: 'Current price is 15% below average forecast',
        recommendedSource: sources[0],
        estimatedSavings: (futureAvgPrice - currentPrice) * 
                         (this.batteryCapacity - this.currentCharge)
      };
    }

    // Can wait for cheaper prices
    if (batteryPercent > 40) {
      const cheapestTime = new Date(forecast.recommendedChargeTime || Date.now());
      return {
        shouldChargeNow: false,
        reason: `Wait for cheaper prices at ${cheapestTime.toLocaleTimeString()}`
      };
    }

    return {
      shouldChargeNow: false,
      reason: 'Battery level adequate, no urgent need to charge'
    };
  }

  // === Statistics ===

  getMarketStats(): EnergyMarketStats {
    let totalSold = 0;
    let totalBought = 0;
    let totalTransactions = 0;

    for (const session of this.sessions.values()) {
      if (session.status === 'completed') {
        totalTransactions++;
        if (session.deviceId === this.deviceId) {
          totalBought += session.energyDelivered;
        }
      }
    }

    for (const source of this.energySources.values()) {
      if (source.ownerId === this.deviceId) {
        totalSold += source.totalSessions;
      }
    }

    return {
      totalEnergySold: totalSold,
      totalEnergyBought: totalBought,
      totalTransactions,
      averagePricePerKwh: this.calculateAveragePrice(),
      gridEfficiency: this.chargingEfficiency
    };
  }

  getBatteryStatus(): {
    currentCharge: number;
    batteryCapacity: number;
    percentage: number;
    estimatedRange: number;
  } {
    const avgConsumptionPerHour = this.calculateAverageConsumption();
    const hoursRemaining = avgConsumptionPerHour > 0 
      ? this.currentCharge / avgConsumptionPerHour 
      : Infinity;

    return {
      currentCharge: this.currentCharge,
      batteryCapacity: this.batteryCapacity,
      percentage: (this.currentCharge / this.batteryCapacity) * 100,
      estimatedRange: hoursRemaining
    };
  }

  // === Utilities ===

  private calculateDistance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  private calculateAveragePrice(): number {
    if (this.priceHistory.length === 0) {
      const sources = Array.from(this.energySources.values());
      if (sources.length === 0) return 0.15; // Default price
      return sources.reduce((sum, s) => sum + s.pricePerKwh, 0) / sources.length;
    }

    const recent = this.priceHistory.slice(-100);
    return recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
  }

  private calculateAverageConsumption(): number {
    if (this.consumptionHistory.length < 2) return 1; // Default 1 kWh/hour

    const recent = this.consumptionHistory.slice(-24);
    const totalEnergy = recent.reduce((sum, c) => sum + c.amount, 0);
    const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 3600000;

    return timeSpan > 0 ? totalEnergy / timeSpan : 1;
  }

  // === External Data Sync ===

  importEnergySource(source: EnergySource): void {
    this.energySources.set(source.id, source);
    this.emit('source:imported', source);
  }

  exportOwnedSources(): EnergySource[] {
    return Array.from(this.energySources.values())
      .filter(s => s.ownerId === this.deviceId);
  }
}
