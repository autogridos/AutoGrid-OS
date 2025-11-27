/**
 * Maintenance Prediction Module
 * 
 * Provides predictive maintenance, health monitoring, and automated
 * repair scheduling for autonomous devices.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskPriority, TaskStatus } from '../types';

// ==================== Types ====================

export enum ComponentType {
  MOTOR = 'motor',
  BATTERY = 'battery',
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  CONTROLLER = 'controller',
  COMMUNICATION = 'communication',
  NAVIGATION = 'navigation',
  GRIPPER = 'gripper',
  WHEEL = 'wheel',
  BEARING = 'bearing',
  BELT = 'belt',
  CAMERA = 'camera',
  LIDAR = 'lidar',
  CUSTOM = 'custom'
}

export enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical',
  FAILED = 'failed'
}

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  PREDICTIVE = 'predictive',
  CORRECTIVE = 'corrective',
  EMERGENCY = 'emergency'
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue'
}

export interface Component {
  id: string;
  type: ComponentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installedAt: number;
  expectedLifespan: number;
  currentOperatingHours: number;
  lastMaintenanceAt?: number;
  maintenanceInterval: number;
  healthScore: number;
  status: HealthStatus;
  metrics: ComponentMetrics;
  failureProbability: number;
  degradationRate: number;
}

export interface ComponentMetrics {
  temperature?: number;
  vibration?: number;
  current?: number;
  voltage?: number;
  rpm?: number;
  pressure?: number;
  efficiency?: number;
  errorCount?: number;
  cycleCount?: number;
  customMetrics?: Record<string, number>;
  lastUpdated: number;
}

export interface HealthReport {
  id: string;
  deviceId: string;
  timestamp: number;
  overallHealth: number;
  status: HealthStatus;
  components: ComponentHealth[];
  predictions: FailurePrediction[];
  recommendations: MaintenanceRecommendation[];
  alerts: HealthAlert[];
  operatingConditions: OperatingConditions;
}

export interface ComponentHealth {
  componentId: string;
  name: string;
  type: ComponentType;
  healthScore: number;
  status: HealthStatus;
  trend: 'improving' | 'stable' | 'degrading' | 'rapid-degradation';
  remainingLife: number;
  metrics: ComponentMetrics;
}

export interface FailurePrediction {
  id: string;
  componentId: string;
  componentName: string;
  predictedFailureTime: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  failureMode: string;
  preventiveAction: string;
  estimatedCost: number;
  riskScore: number;
}

export interface MaintenanceRecommendation {
  id: string;
  componentId: string;
  type: MaintenanceType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  reason: string;
  estimatedDuration: number;
  estimatedCost: number;
  deadline?: number;
  partsRequired: SparePart[];
}

export interface HealthAlert {
  id: string;
  componentId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

export interface OperatingConditions {
  ambientTemperature?: number;
  humidity?: number;
  dustLevel?: number;
  vibrationLevel?: number;
  loadFactor?: number;
  operatingMode?: string;
}

export interface MaintenanceTask {
  id: string;
  deviceId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: TaskPriority;
  components: string[];
  actions: MaintenanceAction[];
  partsRequired: SparePart[];
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  assignedTo?: string;
  estimatedDuration: number;
  actualDuration?: number;
  cost: number;
  notes?: string;
  createdAt: number;
}

export interface MaintenanceAction {
  id: string;
  componentId: string;
  action: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  duration?: number;
  result?: string;
}

export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  compatibleComponents: ComponentType[];
  quantity: number;
  unitCost: number;
  leadTime: number;
  inStock: boolean;
  supplier?: string;
}

export interface MaintenanceSchedule {
  id: string;
  deviceId: string;
  tasks: ScheduledTask[];
  nextMaintenance?: number;
  maintenanceWindow: MaintenanceWindow;
}

export interface ScheduledTask {
  taskId: string;
  scheduledAt: number;
  type: MaintenanceType;
  priority: TaskPriority;
  components: string[];
}

export interface MaintenanceWindow {
  preferredDays: number[];
  preferredHours: { start: number; end: number };
  blackoutPeriods: { start: number; end: number }[];
  maxDowntime: number;
}

export interface PartsInventory {
  parts: Map<string, InventoryItem>;
  reorderThreshold: number;
  autoReorder: boolean;
}

export interface InventoryItem {
  part: SparePart;
  quantity: number;
  location: string;
  lastRestocked: number;
  reservedFor: string[];
}

export interface ServiceProvider {
  id: string;
  name: string;
  capabilities: ComponentType[];
  rating: number;
  availability: boolean;
  location?: { x: number; y: number };
  pricing: Map<string, number>;
  responseTime: number;
}

export interface MaintenanceMetrics {
  mtbf: number;
  mttr: number;
  availability: number;
  plannedDowntime: number;
  unplannedDowntime: number;
  maintenanceCosts: number;
  partsReplaced: number;
  predictedSavings: number;
}

// ==================== Maintenance Prediction Module ====================

export interface MaintenancePredictionConfig {
  deviceId: string;
  reportInterval?: number;
  alertThreshold?: number;
  autoSchedule?: boolean;
  autoOrderParts?: boolean;
}

export class MaintenancePrediction extends EventEmitter {
  private deviceId: string;
  private config: MaintenancePredictionConfig;
  private components: Map<string, Component> = new Map();
  private maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private alerts: Map<string, HealthAlert> = new Map();
  private predictions: Map<string, FailurePrediction> = new Map();
  private schedule: MaintenanceSchedule;
  private inventory: PartsInventory;
  private serviceProviders: Map<string, ServiceProvider> = new Map();
  private healthHistory: HealthReport[] = [];
  private metrics: MaintenanceMetrics;
  private monitoringInterval?: ReturnType<typeof setInterval>;

  constructor(config: MaintenancePredictionConfig) {
    super();
    this.deviceId = config.deviceId;
    this.config = {
      reportInterval: 3600000,
      alertThreshold: 0.7,
      autoSchedule: true,
      autoOrderParts: false,
      ...config
    };

    this.schedule = this.initializeSchedule();
    this.inventory = this.initializeInventory();
    this.metrics = this.initializeMetrics();
  }

  // ==================== Component Management ====================

  registerComponent(params: {
    type: ComponentType;
    name: string;
    expectedLifespan: number;
    maintenanceInterval: number;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
  }): Component {
    const component: Component = {
      id: uuidv4(),
      type: params.type,
      name: params.name,
      manufacturer: params.manufacturer,
      model: params.model,
      serialNumber: params.serialNumber,
      installedAt: Date.now(),
      expectedLifespan: params.expectedLifespan,
      currentOperatingHours: 0,
      maintenanceInterval: params.maintenanceInterval,
      healthScore: 100,
      status: HealthStatus.EXCELLENT,
      metrics: { lastUpdated: Date.now() },
      failureProbability: 0,
      degradationRate: this.calculateDegradationRate(params.expectedLifespan)
    };

    this.components.set(component.id, component);
    this.emit('component:registered', component);

    return component;
  }

  updateComponentMetrics(componentId: string, metrics: Partial<ComponentMetrics>): void {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    component.metrics = {
      ...component.metrics,
      ...metrics,
      lastUpdated: Date.now()
    };

    this.analyzeComponentHealth(component);
    this.emit('component:metrics-updated', { componentId, metrics: component.metrics });
  }

  getComponent(componentId: string): Component | undefined {
    return this.components.get(componentId);
  }

  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  // ==================== Health Monitoring ====================

  enableHealthMonitoring(params?: {
    reportInterval?: number;
    alertThreshold?: number;
  }): void {
    if (params?.reportInterval) {
      this.config.reportInterval = params.reportInterval;
    }
    if (params?.alertThreshold) {
      this.config.alertThreshold = params.alertThreshold;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.reportInterval);

    this.performHealthCheck();

    this.emit('monitoring:enabled', { 
      interval: this.config.reportInterval,
      threshold: this.config.alertThreshold 
    });
  }

  disableHealthMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.emit('monitoring:disabled');
  }

  private performHealthCheck(): void {
    const report = this.generateHealthReport();
    this.healthHistory.push(report);
    
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    for (const alert of report.alerts) {
      if (!alert.acknowledged) {
        this.emit('alert:new', alert);
      }
    }

    for (const prediction of report.predictions) {
      if (prediction.confidence > 0.7 && prediction.severity !== 'low') {
        this.emit('maintenance:predicted', {
          componentId: prediction.componentId,
          prediction,
          report
        });

        if (this.config.autoSchedule) {
          this.schedulePreventiveMaintenance(prediction);
        }
      }
    }

    this.emit('health:report', report);
  }

  generateHealthReport(): HealthReport {
    const componentHealths: ComponentHealth[] = [];
    const predictions: FailurePrediction[] = [];
    const recommendations: MaintenanceRecommendation[] = [];
    const alerts: HealthAlert[] = [];

    let totalHealth = 0;

    for (const component of this.components.values()) {
      this.analyzeComponentHealth(component);

      const health: ComponentHealth = {
        componentId: component.id,
        name: component.name,
        type: component.type,
        healthScore: component.healthScore,
        status: component.status,
        trend: this.calculateHealthTrend(component),
        remainingLife: this.estimateRemainingLife(component),
        metrics: component.metrics
      };

      componentHealths.push(health);
      totalHealth += component.healthScore;

      if (component.healthScore < 80 || component.failureProbability > 0.3) {
        const prediction = this.generateFailurePrediction(component);
        predictions.push(prediction);
        this.predictions.set(prediction.id, prediction);
      }

      if (component.healthScore < 70 || this.isMaintenanceDue(component)) {
        const recommendation = this.generateRecommendation(component);
        recommendations.push(recommendation);
      }

      const componentAlerts = this.checkForAlerts(component);
      alerts.push(...componentAlerts);
    }

    const overallHealth = this.components.size > 0 
      ? totalHealth / this.components.size 
      : 100;

    return {
      id: uuidv4(),
      deviceId: this.deviceId,
      timestamp: Date.now(),
      overallHealth,
      status: this.healthScoreToStatus(overallHealth),
      components: componentHealths,
      predictions,
      recommendations,
      alerts,
      operatingConditions: this.getOperatingConditions()
    };
  }

  getHealthReport(): HealthReport {
    return this.generateHealthReport();
  }

  getHealthHistory(limit?: number): HealthReport[] {
    return limit 
      ? this.healthHistory.slice(-limit)
      : [...this.healthHistory];
  }

  // ==================== Health Analysis ====================

  private analyzeComponentHealth(component: Component): void {
    const metrics = component.metrics;
    let healthPenalty = 0;

    const ageHours = component.currentOperatingHours;
    const ageRatio = ageHours / component.expectedLifespan;
    healthPenalty += Math.min(ageRatio * 30, 30);

    if (metrics.temperature !== undefined) {
      if (metrics.temperature > 80) healthPenalty += 15;
      else if (metrics.temperature > 60) healthPenalty += 5;
    }

    if (metrics.vibration !== undefined) {
      if (metrics.vibration > 10) healthPenalty += 20;
      else if (metrics.vibration > 5) healthPenalty += 10;
    }

    if (metrics.efficiency !== undefined) {
      if (metrics.efficiency < 70) healthPenalty += 15;
      else if (metrics.efficiency < 85) healthPenalty += 5;
    }

    if (metrics.errorCount !== undefined) {
      healthPenalty += Math.min(metrics.errorCount * 2, 20);
    }

    if (component.lastMaintenanceAt) {
      const hoursSinceMaintenance = (Date.now() - component.lastMaintenanceAt) / 3600000;
      if (hoursSinceMaintenance > component.maintenanceInterval * 1.5) {
        healthPenalty += 15;
      } else if (hoursSinceMaintenance > component.maintenanceInterval) {
        healthPenalty += 5;
      }
    }

    component.healthScore = Math.max(0, Math.min(100, 100 - healthPenalty));
    component.status = this.healthScoreToStatus(component.healthScore);
    component.failureProbability = this.calculateFailureProbability(component);
  }

  private calculateFailureProbability(component: Component): number {
    const ageRatio = component.currentOperatingHours / component.expectedLifespan;
    const healthFactor = (100 - component.healthScore) / 100;
    const beta = 2;
    const probability = 1 - Math.exp(-Math.pow(ageRatio * (1 + healthFactor), beta));
    return Math.min(1, Math.max(0, probability));
  }

  private calculateHealthTrend(component: Component): 'improving' | 'stable' | 'degrading' | 'rapid-degradation' {
    const recentReports = this.healthHistory.slice(-5);
    if (recentReports.length < 2) return 'stable';

    const healthValues = recentReports
      .map(r => r.components.find(c => c.componentId === component.id)?.healthScore)
      .filter((h): h is number => h !== undefined);

    if (healthValues.length < 2) return 'stable';

    const firstHalf = healthValues.slice(0, Math.floor(healthValues.length / 2));
    const secondHalf = healthValues.slice(Math.floor(healthValues.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) return 'improving';
    if (diff < -10) return 'rapid-degradation';
    if (diff < -2) return 'degrading';
    return 'stable';
  }

  private estimateRemainingLife(component: Component): number {
    const currentHealth = component.healthScore;
    const degradationRate = component.degradationRate;
    
    if (degradationRate <= 0) return component.expectedLifespan;
    
    const hoursToFailure = (currentHealth - 20) / degradationRate;
    return Math.max(0, hoursToFailure);
  }

  private calculateDegradationRate(expectedLifespan: number): number {
    return 80 / expectedLifespan;
  }

  private healthScoreToStatus(score: number): HealthStatus {
    if (score >= 90) return HealthStatus.EXCELLENT;
    if (score >= 75) return HealthStatus.GOOD;
    if (score >= 50) return HealthStatus.FAIR;
    if (score >= 25) return HealthStatus.POOR;
    if (score > 0) return HealthStatus.CRITICAL;
    return HealthStatus.FAILED;
  }

  private isMaintenanceDue(component: Component): boolean {
    if (!component.lastMaintenanceAt) {
      return component.currentOperatingHours >= component.maintenanceInterval;
    }
    const hoursSinceMaintenance = (Date.now() - component.lastMaintenanceAt) / 3600000;
    return hoursSinceMaintenance >= component.maintenanceInterval;
  }

  // ==================== Predictions & Recommendations ====================

  private generateFailurePrediction(component: Component): FailurePrediction {
    const remainingLife = this.estimateRemainingLife(component);
    const predictedFailureTime = Date.now() + remainingLife * 3600000;

    const severity = component.healthScore < 30 ? 'critical' :
                    component.healthScore < 50 ? 'high' :
                    component.healthScore < 70 ? 'medium' : 'low';

    const failureMode = this.predictFailureMode(component);
    
    return {
      id: uuidv4(),
      componentId: component.id,
      componentName: component.name,
      predictedFailureTime,
      confidence: Math.min(0.95, 0.5 + component.failureProbability * 0.45),
      severity,
      failureMode,
      preventiveAction: this.suggestPreventiveAction(component, failureMode),
      estimatedCost: this.estimateRepairCost(component),
      riskScore: Math.round(component.failureProbability * 100)
    };
  }

  private predictFailureMode(component: Component): string {
    const metrics = component.metrics;

    if (metrics.temperature && metrics.temperature > 80) return 'thermal_overload';
    if (metrics.vibration && metrics.vibration > 10) return 'mechanical_wear';
    if (metrics.efficiency && metrics.efficiency < 60) return 'performance_degradation';
    if (metrics.errorCount && metrics.errorCount > 10) return 'electronic_failure';

    switch (component.type) {
      case ComponentType.MOTOR: return 'bearing_failure';
      case ComponentType.BATTERY: return 'capacity_loss';
      case ComponentType.SENSOR: return 'calibration_drift';
      case ComponentType.BELT: return 'belt_wear';
      case ComponentType.WHEEL: return 'tire_wear';
      default: return 'general_wear';
    }
  }

  private suggestPreventiveAction(component: Component, failureMode: string): string {
    const actions: Record<string, string> = {
      'thermal_overload': 'Improve cooling or reduce operating load',
      'mechanical_wear': 'Lubricate moving parts and check alignment',
      'performance_degradation': 'Calibrate and clean component',
      'electronic_failure': 'Check connections and replace worn connectors',
      'bearing_failure': 'Replace bearings and lubricate',
      'capacity_loss': 'Recondition or replace battery',
      'calibration_drift': 'Recalibrate sensor',
      'belt_wear': 'Adjust tension or replace belt',
      'tire_wear': 'Rotate or replace wheels',
      'general_wear': 'Perform comprehensive maintenance'
    };

    return actions[failureMode] || 'Schedule preventive maintenance';
  }

  private generateRecommendation(component: Component): MaintenanceRecommendation {
    const type = component.healthScore < 50 ? MaintenanceType.CORRECTIVE :
                 component.failureProbability > 0.5 ? MaintenanceType.PREDICTIVE :
                 MaintenanceType.PREVENTIVE;

    const priority = component.healthScore < 30 ? 'critical' :
                    component.healthScore < 50 ? 'high' :
                    component.healthScore < 70 ? 'medium' : 'low';

    return {
      id: uuidv4(),
      componentId: component.id,
      type,
      priority,
      action: this.suggestPreventiveAction(component, this.predictFailureMode(component)),
      reason: `Component health at ${component.healthScore}%, ${component.status} status`,
      estimatedDuration: this.estimateMaintenanceDuration(component),
      estimatedCost: this.estimateRepairCost(component),
      deadline: priority === 'critical' ? Date.now() + 3600000 : undefined,
      partsRequired: this.getRequiredParts(component)
    };
  }

  private estimateRepairCost(component: Component): number {
    const baseCosts: Record<ComponentType, number> = {
      [ComponentType.MOTOR]: 500,
      [ComponentType.BATTERY]: 800,
      [ComponentType.SENSOR]: 200,
      [ComponentType.ACTUATOR]: 400,
      [ComponentType.CONTROLLER]: 600,
      [ComponentType.COMMUNICATION]: 300,
      [ComponentType.NAVIGATION]: 700,
      [ComponentType.GRIPPER]: 350,
      [ComponentType.WHEEL]: 150,
      [ComponentType.BEARING]: 100,
      [ComponentType.BELT]: 50,
      [ComponentType.CAMERA]: 400,
      [ComponentType.LIDAR]: 1200,
      [ComponentType.CUSTOM]: 300
    };

    const baseCost = baseCosts[component.type] || 300;
    const severityMultiplier = 1 + (100 - component.healthScore) / 100;

    return Math.round(baseCost * severityMultiplier);
  }

  private estimateMaintenanceDuration(component: Component): number {
    const baseDurations: Record<ComponentType, number> = {
      [ComponentType.MOTOR]: 60,
      [ComponentType.BATTERY]: 30,
      [ComponentType.SENSOR]: 20,
      [ComponentType.ACTUATOR]: 45,
      [ComponentType.CONTROLLER]: 90,
      [ComponentType.COMMUNICATION]: 30,
      [ComponentType.NAVIGATION]: 60,
      [ComponentType.GRIPPER]: 40,
      [ComponentType.WHEEL]: 20,
      [ComponentType.BEARING]: 45,
      [ComponentType.BELT]: 15,
      [ComponentType.CAMERA]: 25,
      [ComponentType.LIDAR]: 45,
      [ComponentType.CUSTOM]: 30
    };

    return baseDurations[component.type] || 30;
  }

  private getRequiredParts(component: Component): SparePart[] {
    const partTemplates: Record<ComponentType, Partial<SparePart>[]> = {
      [ComponentType.MOTOR]: [
        { name: 'Motor Bearing', partNumber: 'MB-001', unitCost: 50 },
        { name: 'Motor Brush', partNumber: 'MBR-001', unitCost: 20 }
      ],
      [ComponentType.BATTERY]: [
        { name: 'Battery Cell', partNumber: 'BC-001', unitCost: 200 }
      ],
      [ComponentType.BELT]: [
        { name: 'Drive Belt', partNumber: 'DB-001', unitCost: 30 }
      ],
      [ComponentType.WHEEL]: [
        { name: 'Wheel Assembly', partNumber: 'WA-001', unitCost: 80 }
      ],
      [ComponentType.SENSOR]: [],
      [ComponentType.ACTUATOR]: [],
      [ComponentType.CONTROLLER]: [],
      [ComponentType.COMMUNICATION]: [],
      [ComponentType.NAVIGATION]: [],
      [ComponentType.GRIPPER]: [],
      [ComponentType.CAMERA]: [],
      [ComponentType.LIDAR]: [],
      [ComponentType.BEARING]: [
        { name: 'Bearing Kit', partNumber: 'BK-001', unitCost: 40 }
      ],
      [ComponentType.CUSTOM]: []
    };

    const templates = partTemplates[component.type] || [];
    
    return templates.map(t => ({
      id: uuidv4(),
      name: t.name || 'Generic Part',
      partNumber: t.partNumber || 'GP-001',
      compatibleComponents: [component.type],
      quantity: 1,
      unitCost: t.unitCost || 50,
      leadTime: 24,
      inStock: this.checkPartInStock(t.partNumber || '')
    }));
  }

  // ==================== Alerts ====================

  private checkForAlerts(component: Component): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    if (component.healthScore < (this.config.alertThreshold || 0.7) * 100) {
      alerts.push(this.createAlert(
        component.id,
        component.healthScore < 30 ? 'critical' : 'warning',
        `${component.name} health at ${component.healthScore}%`
      ));
    }

    if (component.metrics.temperature && component.metrics.temperature > 75) {
      alerts.push(this.createAlert(
        component.id,
        component.metrics.temperature > 90 ? 'critical' : 'warning',
        `${component.name} temperature high: ${component.metrics.temperature}°C`
      ));
    }

    if (component.metrics.vibration && component.metrics.vibration > 8) {
      alerts.push(this.createAlert(
        component.id,
        component.metrics.vibration > 12 ? 'error' : 'warning',
        `${component.name} excessive vibration: ${component.metrics.vibration}mm/s`
      ));
    }

    if (this.isMaintenanceDue(component)) {
      const overdue = component.lastMaintenanceAt 
        ? (Date.now() - component.lastMaintenanceAt) / 3600000 - component.maintenanceInterval
        : component.currentOperatingHours - component.maintenanceInterval;
      
      alerts.push(this.createAlert(
        component.id,
        overdue > component.maintenanceInterval * 0.5 ? 'error' : 'warning',
        `${component.name} maintenance overdue by ${Math.round(overdue)} hours`
      ));
    }

    return alerts;
  }

  private createAlert(componentId: string, severity: HealthAlert['severity'], message: string): HealthAlert {
    const alert: HealthAlert = {
      id: uuidv4(),
      componentId,
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.emit('alert:resolved', alert);
    }
  }

  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolvedAt);
  }

  // ==================== Maintenance Scheduling ====================

  async scheduleMaintenance(params: {
    type: MaintenanceType;
    components: string[];
    priority?: TaskPriority;
    scheduledAt?: number;
    assignTo?: string;
  }): Promise<MaintenanceTask> {
    const actions: MaintenanceAction[] = [];
    const partsRequired: SparePart[] = [];
    let totalDuration = 0;
    let totalCost = 0;

    for (const componentId of params.components) {
      const component = this.components.get(componentId);
      if (!component) continue;

      const failureMode = this.predictFailureMode(component);
      
      actions.push({
        id: uuidv4(),
        componentId,
        action: this.suggestPreventiveAction(component, failureMode),
        status: 'pending'
      });

      partsRequired.push(...this.getRequiredParts(component));
      totalDuration += this.estimateMaintenanceDuration(component);
      totalCost += this.estimateRepairCost(component);
    }

    const task: MaintenanceTask = {
      id: uuidv4(),
      deviceId: this.deviceId,
      type: params.type,
      status: MaintenanceStatus.SCHEDULED,
      priority: params.priority || TaskPriority.NORMAL,
      components: params.components,
      actions,
      partsRequired,
      scheduledAt: params.scheduledAt || this.findNextMaintenanceSlot(),
      assignedTo: params.assignTo,
      estimatedDuration: totalDuration,
      cost: totalCost,
      createdAt: Date.now()
    };

    this.maintenanceTasks.set(task.id, task);
    
    this.schedule.tasks.push({
      taskId: task.id,
      scheduledAt: task.scheduledAt,
      type: task.type,
      priority: task.priority,
      components: task.components
    });

    for (const part of partsRequired) {
      this.reservePart(part.partNumber, task.id);
    }

    this.emit('maintenance:scheduled', task);

    return task;
  }

  private schedulePreventiveMaintenance(prediction: FailurePrediction): void {
    const existingTask = Array.from(this.maintenanceTasks.values())
      .find(t => t.components.includes(prediction.componentId) && 
                 t.status === MaintenanceStatus.SCHEDULED);

    if (existingTask) return;

    const leadTime = 24 * 3600000;
    const scheduledAt = Math.max(
      Date.now() + 3600000,
      prediction.predictedFailureTime - leadTime
    );

    this.scheduleMaintenance({
      type: MaintenanceType.PREDICTIVE,
      components: [prediction.componentId],
      priority: prediction.severity === 'critical' ? TaskPriority.CRITICAL :
               prediction.severity === 'high' ? TaskPriority.HIGH : TaskPriority.NORMAL,
      scheduledAt
    });
  }

  async startMaintenance(taskId: string): Promise<void> {
    const task = this.maintenanceTasks.get(taskId);
    if (!task) {
      throw new Error('Maintenance task not found');
    }

    task.status = MaintenanceStatus.IN_PROGRESS;
    task.startedAt = Date.now();

    this.emit('maintenance:started', task);
  }

  async completeMaintenance(taskId: string, results: {
    actions: { actionId: string; result: string }[];
    notes?: string;
  }): Promise<void> {
    const task = this.maintenanceTasks.get(taskId);
    if (!task) {
      throw new Error('Maintenance task not found');
    }

    for (const result of results.actions) {
      const action = task.actions.find(a => a.id === result.actionId);
      if (action) {
        action.status = 'completed';
        action.result = result.result;
      }
    }

    task.status = MaintenanceStatus.COMPLETED;
    task.completedAt = Date.now();
    task.actualDuration = (task.completedAt - (task.startedAt || task.scheduledAt)) / 60000;
    task.notes = results.notes;

    for (const componentId of task.components) {
      const component = this.components.get(componentId);
      if (component) {
        component.lastMaintenanceAt = Date.now();
        component.healthScore = Math.min(100, component.healthScore + 30);
        component.status = this.healthScoreToStatus(component.healthScore);
        component.failureProbability = this.calculateFailureProbability(component);
      }
    }

    this.updateMetrics(task);

    for (const part of task.partsRequired) {
      this.releasePart(part.partNumber, taskId);
    }

    this.emit('maintenance:completed', task);
  }

  async cancelMaintenance(taskId: string, reason?: string): Promise<void> {
    const task = this.maintenanceTasks.get(taskId);
    if (!task) {
      throw new Error('Maintenance task not found');
    }

    task.status = MaintenanceStatus.CANCELLED;
    task.notes = reason;

    for (const part of task.partsRequired) {
      this.releasePart(part.partNumber, taskId);
    }

    this.schedule.tasks = this.schedule.tasks.filter(t => t.taskId !== taskId);

    this.emit('maintenance:cancelled', { taskId, reason });
  }

  getMaintenanceTask(taskId: string): MaintenanceTask | undefined {
    return this.maintenanceTasks.get(taskId);
  }

  getScheduledMaintenance(): MaintenanceTask[] {
    return Array.from(this.maintenanceTasks.values())
      .filter(t => t.status === MaintenanceStatus.SCHEDULED)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }

  private findNextMaintenanceSlot(): number {
    const window = this.schedule.maintenanceWindow;
    let candidate = Date.now() + 3600000;

    for (let i = 0; i < 168; i++) { // Check next 7 days
      const date = new Date(candidate);
      const day = date.getDay();
      const hour = date.getHours();

      if (window.preferredDays.includes(day)) {
        if (hour >= window.preferredHours.start && hour < window.preferredHours.end) {
          const inBlackout = window.blackoutPeriods.some(
            p => candidate >= p.start && candidate <= p.end
          );

          if (!inBlackout) {
            return candidate;
          }
        }
      }

      candidate += 3600000;
    }

    return candidate;
  }

  // ==================== Parts Inventory ====================

  addPartToInventory(part: SparePart, quantity: number, location: string): void {
    const existing = this.inventory.parts.get(part.partNumber);
    
    if (existing) {
      existing.quantity += quantity;
      existing.lastRestocked = Date.now();
    } else {
      this.inventory.parts.set(part.partNumber, {
        part,
        quantity,
        location,
        lastRestocked: Date.now(),
        reservedFor: []
      });
    }

    this.emit('inventory:updated', { partNumber: part.partNumber, quantity });
  }

  private checkPartInStock(partNumber: string): boolean {
    const item = this.inventory.parts.get(partNumber);
    return item ? item.quantity > item.reservedFor.length : false;
  }

  private reservePart(partNumber: string, taskId: string): boolean {
    const item = this.inventory.parts.get(partNumber);
    if (!item) return false;

    const available = item.quantity - item.reservedFor.length;
    if (available <= 0) {
      if (this.config.autoOrderParts) {
        this.emit('parts:order-needed', { partNumber, quantity: 1 });
      }
      return false;
    }

    item.reservedFor.push(taskId);
    return true;
  }

  private releasePart(partNumber: string, taskId: string): void {
    const item = this.inventory.parts.get(partNumber);
    if (item) {
      item.reservedFor = item.reservedFor.filter(id => id !== taskId);
    }
  }

  consumePart(partNumber: string, taskId: string): boolean {
    const item = this.inventory.parts.get(partNumber);
    if (!item || item.quantity <= 0) return false;

    item.quantity--;
    item.reservedFor = item.reservedFor.filter(id => id !== taskId);

    if (item.quantity <= this.inventory.reorderThreshold) {
      this.emit('parts:low-stock', { partNumber, quantity: item.quantity });
    }

    return true;
  }

  getInventory(): InventoryItem[] {
    return Array.from(this.inventory.parts.values());
  }

  // ==================== Service Providers ====================

  registerServiceProvider(provider: ServiceProvider): void {
    this.serviceProviders.set(provider.id, provider);
    this.emit('provider:registered', provider);
  }

  async findServiceProvider(params: {
    componentType: ComponentType;
    urgency?: 'low' | 'normal' | 'high' | 'emergency';
  }): Promise<ServiceProvider | undefined> {
    const compatible = Array.from(this.serviceProviders.values())
      .filter(p => p.capabilities.includes(params.componentType) && p.availability);

    if (compatible.length === 0) return undefined;

    const urgencyWeight = params.urgency === 'emergency' ? 0.8 : 
                         params.urgency === 'high' ? 0.6 : 0.3;

    compatible.sort((a, b) => {
      const scoreA = a.rating * (1 - urgencyWeight) + (1 / a.responseTime) * urgencyWeight;
      const scoreB = b.rating * (1 - urgencyWeight) + (1 / b.responseTime) * urgencyWeight;
      return scoreB - scoreA;
    });

    return compatible[0];
  }

  async requestService(params: {
    taskId: string;
    providerId: string;
    priority?: TaskPriority;
  }): Promise<boolean> {
    const provider = this.serviceProviders.get(params.providerId);
    if (!provider || !provider.availability) {
      return false;
    }

    const task = this.maintenanceTasks.get(params.taskId);
    if (!task) {
      return false;
    }

    task.assignedTo = params.providerId;
    
    this.emit('service:requested', { 
      taskId: params.taskId, 
      providerId: params.providerId,
      task 
    });

    return true;
  }

  // ==================== Metrics ====================

  private updateMetrics(completedTask: MaintenanceTask): void {
    const allTasks = Array.from(this.maintenanceTasks.values())
      .filter(t => t.status === MaintenanceStatus.COMPLETED);

    const totalRepairTime = allTasks
      .filter(t => t.actualDuration)
      .reduce((sum, t) => sum + (t.actualDuration || 0), 0);
    this.metrics.mttr = allTasks.length > 0 ? totalRepairTime / allTasks.length : 0;

    this.metrics.maintenanceCosts += completedTask.cost;
    this.metrics.partsReplaced += completedTask.partsRequired.length;

    if (completedTask.type === MaintenanceType.PREDICTIVE) {
      this.metrics.predictedSavings += completedTask.cost * 0.25;
    }

    this.emit('metrics:updated', this.metrics);
  }

  getMetrics(): MaintenanceMetrics {
    return { ...this.metrics };
  }

  // ==================== Operating Conditions ====================

  updateOperatingConditions(conditions: Partial<OperatingConditions>): void {
    this.emit('conditions:updated', conditions);
  }

  private getOperatingConditions(): OperatingConditions {
    return {
      ambientTemperature: 25,
      humidity: 45,
      dustLevel: 0.2,
      vibrationLevel: 1,
      loadFactor: 0.6,
      operatingMode: 'normal'
    };
  }

  // ==================== Operating Hours ====================

  recordOperatingHours(hours: number): void {
    for (const component of this.components.values()) {
      component.currentOperatingHours += hours;
      
      const healthLoss = hours * component.degradationRate;
      component.healthScore = Math.max(0, component.healthScore - healthLoss);
      component.status = this.healthScoreToStatus(component.healthScore);
    }

    this.emit('hours:recorded', { hours, totalComponents: this.components.size });
  }

  // ==================== Initialization ====================

  private initializeSchedule(): MaintenanceSchedule {
    return {
      id: uuidv4(),
      deviceId: this.deviceId,
      tasks: [],
      maintenanceWindow: {
        preferredDays: [1, 2, 3, 4, 5],
        preferredHours: { start: 2, end: 6 },
        blackoutPeriods: [],
        maxDowntime: 120
      }
    };
  }

  private initializeInventory(): PartsInventory {
    return {
      parts: new Map(),
      reorderThreshold: 2,
      autoReorder: this.config.autoOrderParts || false
    };
  }

  private initializeMetrics(): MaintenanceMetrics {
    return {
      mtbf: 0,
      mttr: 0,
      availability: 100,
      plannedDowntime: 0,
      unplannedDowntime: 0,
      maintenanceCosts: 0,
      partsReplaced: 0,
      predictedSavings: 0
    };
  }
}

export default MaintenancePrediction;
