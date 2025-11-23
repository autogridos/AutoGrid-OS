/**
 * Example: Warehouse Robot Fleet
 * 
 * Demonstrates autonomous task distribution and payment
 * in a warehouse environment
 */

import { AutoGridOS, DeviceType, FleetManager } from '@autogrid/os';

async function warehouseExample() {
  // Initialize warehouse robots
  const robot1 = new AutoGridOS({
    deviceId: 'warehouse-bot-001',
    deviceType: DeviceType.WAREHOUSE,
    privateKey: 'key-001',
    capabilities: ['transport', 'sorting', 'picking'],
    location: { x: 10, y: 20, floor: 1 }
  });

  const robot2 = new AutoGridOS({
    deviceId: 'warehouse-bot-002',
    deviceType: DeviceType.WAREHOUSE,
    privateKey: 'key-002',
    capabilities: ['transport', 'sorting'],
    location: { x: 50, y: 30, floor: 1 }
  });

  const robot3 = new AutoGridOS({
    deviceId: 'warehouse-bot-003',
    deviceType: DeviceType.WAREHOUSE,
    privateKey: 'key-003',
    capabilities: ['transport', 'picking', 'heavy-lift'],
    location: { x: 80, y: 10, floor: 2 }
  });

  // Connect all robots to the network
  await Promise.all([
    robot1.connect(),
    robot2.connect(),
    robot3.connect()
  ]);

  console.log('✓ All robots connected to AutoGrid network');

  // Create fleet manager
  const fleet = new FleetManager({
    fleetId: 'warehouse-alpha',
    devices: ['warehouse-bot-001', 'warehouse-bot-002', 'warehouse-bot-003'],
    allowInternalMarket: true,
    allowTaskSwapping: true,
    allowResourceSharing: true,
    dynamicPricing: true
  });

  console.log('✓ Fleet manager initialized');

  // Setup event listeners
  robot1.onTaskAvailable((task) => {
    console.log(`\n[Robot 1] New task available: ${task.type}`);
    robot1.submitBid(task.id, { price: 'auto', estimatedDuration: 300 });
  });

  robot1.onTaskAssigned(async (task) => {
    console.log(`[Robot 1] Task assigned: ${task.id}`);
    await robot1.submitProof(task.id, { completed: true });
  });

  // Publish tasks
  await robot1.publishTask({
    type: 'transport',
    payload: { from: { x: 10, y: 20 }, to: { x: 80, y: 60 } },
    maxPrice: 500
  });

  console.log('✓ Warehouse example completed!');
}

warehouseExample();
