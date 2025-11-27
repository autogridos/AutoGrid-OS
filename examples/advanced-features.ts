/**
 * AutoGrid OS 2.0 - Advanced Features Example
 * 
 * Demonstrates the new modules: Swarm Intelligence, Insurance, and Maintenance Prediction
 */

import {
  AutoGridOS,
  DeviceType,
  SwarmIntelligence,
  SwarmAlgorithm,
  FormationType,
  InsuranceModule,
  InsuranceType,
  MaintenancePrediction,
  ComponentType,
  TaskPriority
} from '@autogrid/os';

async function main() {
  // Initialize main robot
  const robot = new AutoGridOS({
    deviceId: 'warehouse-bot-001',
    deviceType: DeviceType.WAREHOUSE,
    privateKey: 'your-private-key',
    capabilities: ['transport', 'picking', 'sorting'],
    location: { x: 0, y: 0, floor: 1 }
  });

  await robot.connect();
  console.log('🤖 Robot connected to AutoGrid network');

  // ============================================================
  // SWARM INTELLIGENCE - Collective Problem Solving
  // ============================================================

  console.log('\n🐝 === SWARM INTELLIGENCE ===\n');

  const swarmModule = new SwarmIntelligence({
    deviceId: robot.getDeviceId(),
    maxSwarms: 5,
    defaultAlgorithm: SwarmAlgorithm.ANT_COLONY
  });

  // Form a swarm for large-scale cleanup
  const cleanupSwarm = await swarmModule.formSwarm({
    taskId: 'large-cleanup-001',
    minDevices: 5,
    maxDevices: 10,
    algorithm: SwarmAlgorithm.ANT_COLONY,
    objective: {
      type: 'coverage',
      target: [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ],
      successCriteria: {
        minCoverage: 95,
        timeLimit: 3600000 // 1 hour
      }
    },
    parameters: {
      pheromoneDecay: 0.1,
      explorationRate: 0.3,
      communicationRange: 50
    }
  });

  console.log(`✅ Swarm formed: ${cleanupSwarm.id}`);

  // Join the swarm
  await cleanupSwarm.join(robot.getDeviceId(), { x: 0, y: 0 });

  // Simulate other robots joining
  for (let i = 2; i <= 5; i++) {
    await cleanupSwarm.join(`robot-00${i}`, { x: i * 10, y: i * 10 });
  }

  console.log(`👥 Swarm members: ${cleanupSwarm.getMembers().length}`);

  // Listen for movement suggestions from swarm algorithm
  cleanupSwarm.on('movement:suggested', (data) => {
    console.log(`📍 Movement suggested for ${data.deviceId}:`, data.target);
  });

  // Execute coordinated action - surround formation
  const action = await cleanupSwarm.coordinatedAction(
    'surround',
    { x: 50, y: 50 }, // Target center
    {
      formation: FormationType.SURROUND,
      timing: 'synchronized'
    }
  );

  console.log(`🎯 Coordinated action started: ${action.actionId}`);

  // Deposit pheromone trail (for ant colony algorithm)
  cleanupSwarm.depositPheromone(
    robot.getDeviceId(),
    [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }],
    'success',
    1.0
  );

  // Get swarm metrics
  const swarmMetrics = cleanupSwarm.getMetrics();
  console.log('📊 Swarm metrics:', {
    members: swarmMetrics.memberCount,
    coverage: `${swarmMetrics.coverage.toFixed(1)}%`,
    efficiency: `${swarmMetrics.efficiency.toFixed(1)}%`
  });

  // ============================================================
  // INSURANCE & COLLATERAL - Risk Management
  // ============================================================

  console.log('\n🛡️ === INSURANCE & COLLATERAL ===\n');

  const insurance = new InsuranceModule({
    deviceId: robot.getDeviceId(),
    autoInsure: false,
    maxPremiumRate: 0.1
  });

  // Get insurance quote for a task
  const quote = await insurance.getQuote({
    taskId: 'high-value-transport-001',
    type: InsuranceType.COMPREHENSIVE,
    coverage: 10000,
    duration: 86400000 // 24 hours
  });

  console.log('💰 Insurance quote:', {
    coverage: quote.coverage,
    premium: quote.premium,
    deductible: quote.deductible,
    riskScore: quote.riskAssessment.riskScore
  });

  // Purchase insurance policy
  const policy = await insurance.insureTask('high-value-transport-001', {
    coverage: 10000,
    type: InsuranceType.COMPREHENSIVE,
    quoteId: quote.id
  });

  console.log(`✅ Policy purchased: ${policy.id}`);
  console.log(`   Coverage: ${policy.coverage}`);
  console.log(`   Premium: ${policy.premium}`);
  console.log(`   Valid until: ${new Date(policy.endTime).toLocaleString()}`);

  // Lock collateral for task execution
  const collateral = await insurance.lockCollateral({
    taskId: 'high-value-transport-001',
    amount: 500,
    beneficiaryId: 'task-publisher-001',
    type: 'escrow',
    conditions: {
      releaseOnSuccess: true,
      forfeitOnFailure: true,
      disputeWindow: 3600000
    }
  });

  console.log(`🔒 Collateral locked: ${collateral.amount} units`);

  // Join or create an insurance pool
  await insurance.joinPool('fleet-insurance-pool', 1000);
  console.log('🏊 Joined fleet insurance pool with 1000 contribution');

  // Get pool info
  const pool = insurance.getPool('fleet-insurance-pool');
  if (pool) {
    console.log('📊 Pool status:', {
      totalFunds: pool.totalFunds,
      activePolicies: pool.performance.activePolicies,
      lossRatio: `${(pool.performance.lossRatio * 100).toFixed(1)}%`
    });
  }

  // Simulate task completion - release collateral
  await insurance.releaseCollateral(collateral.id, 'Task completed successfully');
  console.log('✅ Collateral released');

  // ============================================================
  // MAINTENANCE PREDICTION - Predictive Health Monitoring
  // ============================================================

  console.log('\n🔧 === MAINTENANCE PREDICTION ===\n');

  const maintenance = new MaintenancePrediction({
    deviceId: robot.getDeviceId(),
    reportInterval: 3600000, // 1 hour
    alertThreshold: 0.7,
    autoSchedule: true,
    autoOrderParts: false
  });

  // Register robot components
  const motor = maintenance.registerComponent({
    type: ComponentType.MOTOR,
    name: 'Drive Motor',
    expectedLifespan: 10000, // 10,000 operating hours
    maintenanceInterval: 500,
    manufacturer: 'RoboMotors Inc',
    model: 'DM-5000'
  });

  const battery = maintenance.registerComponent({
    type: ComponentType.BATTERY,
    name: 'Main Battery Pack',
    expectedLifespan: 5000,
    maintenanceInterval: 200,
    manufacturer: 'PowerCell',
    model: 'PC-48V-100AH'
  });

  const lidar = maintenance.registerComponent({
    type: ComponentType.LIDAR,
    name: 'Navigation LIDAR',
    expectedLifespan: 20000,
    maintenanceInterval: 1000,
    manufacturer: 'SensorTech',
    model: 'LR-360'
  });

  console.log('🔩 Components registered:', [motor, battery, lidar].map(c => c.name).join(', '));

  // Update component metrics (simulating sensor data)
  maintenance.updateComponentMetrics(motor.id, {
    temperature: 65,
    vibration: 3.5,
    rpm: 2500,
    efficiency: 92,
    errorCount: 2
  });

  maintenance.updateComponentMetrics(battery.id, {
    voltage: 48.2,
    current: 25,
    temperature: 35,
    efficiency: 88
  });

  maintenance.updateComponentMetrics(lidar.id, {
    temperature: 42,
    errorCount: 0
  });

  // Enable health monitoring
  maintenance.enableHealthMonitoring({
    reportInterval: 3600000,
    alertThreshold: 0.7
  });

  // Listen for maintenance predictions
  maintenance.on('maintenance:predicted', (data) => {
    console.log('⚠️ Maintenance predicted:', {
      component: data.prediction.componentName,
      severity: data.prediction.severity,
      confidence: `${(data.prediction.confidence * 100).toFixed(0)}%`,
      action: data.prediction.preventiveAction
    });
  });

  // Listen for alerts
  maintenance.on('alert:new', (alert) => {
    console.log(`🚨 Alert [${alert.severity}]: ${alert.message}`);
  });

  // Get health report
  const healthReport = maintenance.getHealthReport();
  console.log('📋 Health Report:', {
    overallHealth: `${healthReport.overallHealth.toFixed(1)}%`,
    status: healthReport.status,
    components: healthReport.components.length,
    predictions: healthReport.predictions.length,
    alerts: healthReport.alerts.length
  });

  // Display component health
  console.log('\n📊 Component Health:');
  for (const comp of healthReport.components) {
    console.log(`   ${comp.name}: ${comp.healthScore.toFixed(0)}% (${comp.status}) - ${comp.trend}`);
  }

  // Record operating hours (simulating usage)
  maintenance.recordOperatingHours(10);

  // Schedule preventive maintenance
  const maintenanceTask = await maintenance.scheduleMaintenance({
    type: 'preventive' as any,
    components: [motor.id],
    priority: TaskPriority.NORMAL
  });

  console.log(`\n📅 Maintenance scheduled: ${maintenanceTask.id}`);
  console.log(`   Scheduled at: ${new Date(maintenanceTask.scheduledAt).toLocaleString()}`);
  console.log(`   Estimated duration: ${maintenanceTask.estimatedDuration} minutes`);
  console.log(`   Estimated cost: ${maintenanceTask.cost}`);

  // Add parts to inventory
  maintenance.addPartToInventory(
    {
      id: 'part-001',
      name: 'Motor Bearing',
      partNumber: 'MB-001',
      compatibleComponents: [ComponentType.MOTOR],
      quantity: 1,
      unitCost: 50,
      leadTime: 24,
      inStock: true
    },
    5,
    'Warehouse-A Shelf-3'
  );

  console.log('📦 Parts added to inventory');

  // Get maintenance metrics
  const maintenanceMetrics = maintenance.getMetrics();
  console.log('\n📈 Maintenance Metrics:', {
    mttr: `${maintenanceMetrics.mttr.toFixed(1)} minutes`,
    availability: `${maintenanceMetrics.availability.toFixed(1)}%`,
    predictedSavings: `${maintenanceMetrics.predictedSavings} units`
  });

  // ============================================================
  // INTEGRATION - Using All Modules Together
  // ============================================================

  console.log('\n🔄 === INTEGRATED WORKFLOW ===\n');

  // Scenario: High-value coordinated transport task

  // 1. Check robot health before accepting task
  const preTaskHealth = maintenance.getHealthReport();
  if (preTaskHealth.overallHealth < 80) {
    console.log('⚠️ Robot health below threshold, scheduling maintenance first');
    // Would schedule maintenance here
  } else {
    console.log('✅ Robot health OK, proceeding with task');
  }

  // 2. Form swarm for coordinated transport
  const transportSwarm = await swarmModule.formSwarm({
    taskId: 'coordinated-transport-001',
    minDevices: 3,
    algorithm: SwarmAlgorithm.FLOCKING,
    objective: {
      type: 'transport',
      target: { x: 200, y: 200 },
      successCriteria: {
        allDelivered: true
      }
    }
  });

  // 3. Insure the task
  const transportPolicy = await insurance.insureTask('coordinated-transport-001', {
    coverage: 5000,
    type: InsuranceType.TASK_FAILURE
  });

  // 4. Lock collateral
  const transportCollateral = await insurance.lockCollateral({
    taskId: 'coordinated-transport-001',
    amount: 250,
    beneficiaryId: 'cargo-owner-001'
  });

  console.log('🚀 Integrated workflow setup complete:');
  console.log(`   Swarm: ${transportSwarm.id}`);
  console.log(`   Insurance: ${transportPolicy.id}`);
  console.log(`   Collateral: ${transportCollateral.id}`);

  // Cleanup
  await transportSwarm.dissolve();
  maintenance.disableHealthMonitoring();
  
  console.log('\n✅ AutoGrid OS 2.0 demo complete!');
}

main().catch(console.error);
