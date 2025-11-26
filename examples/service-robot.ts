/**
 * Service Robot Example
 * 
 * This example demonstrates how to create and operate
 * a service robot for hospitality and delivery tasks.
 */

import { ServiceRobotAdapter } from '../src/adapters/ServiceRobotAdapter';

async function main() {
  // Create a hospitality service robot
  const serviceBot = new ServiceRobotAdapter({
    deviceId: 'service-bot-001',
    privateKey: 'service-private-key',
    serviceType: 'hospitality',
    capabilities: [
      'navigation',
      'delivery',
      'customer-interaction',
      'elevator-control',
      'speech'
    ],
    initialLocation: { x: 0, y: 0, floor: 1 },
    maxSpeed: 1.2,
    batteryCapacity: 10000,
    interactionLanguages: ['en', 'es', 'zh']
  });

  // Setup event handlers
  serviceBot.on('robot:started', (data) => {
    console.log('🤖 Service robot started:', data.deviceId);
  });

  serviceBot.on('delivery:started', (data) => {
    console.log('📦 Starting delivery:', data.delivery.orderId);
  });

  serviceBot.on('delivery:pickup', (data) => {
    console.log('✅ Picked up order:', data.orderId);
  });

  serviceBot.on('delivery:completed', (data) => {
    console.log('🎉 Delivery completed to room:', data.deliveredTo);
  });

  serviceBot.on('navigation:started', (data) => {
    console.log(`🚶 Navigating: ${data.distance.toFixed(1)}m to destination`);
  });

  serviceBot.on('elevator:requested', (data) => {
    console.log(`🛗 Elevator requested for floor ${data.targetFloor}`);
  });

  serviceBot.on('charging:requested', () => {
    console.log('🔋 Battery low, heading to charging station');
  });

  serviceBot.on('charging:completed', (data) => {
    console.log(`⚡ Charging complete: ${data.batteryLevel}%`);
  });

  serviceBot.on('interaction:completed', (data) => {
    console.log('💬 Customer interaction completed');
  });

  serviceBot.on('task:failed', (data) => {
    console.error('❌ Task failed:', data.error);
  });

  // Start the robot
  await serviceBot.start();

  // Example: Execute a room service delivery
  console.log('\n--- Room Service Delivery ---');
  
  const deliveryTask = {
    id: 'task-001',
    type: 'delivery',
    status: 'assigned' as const,
    priority: 'normal' as const,
    publisherId: 'hotel-system',
    payload: {
      orderId: 'order-12345',
      items: [
        { id: 'item-1', name: 'Club Sandwich', quantity: 1 },
        { id: 'item-2', name: 'Sparkling Water', quantity: 2 }
      ],
      destination: {
        room: '512',
        floor: 5,
        x: 120,
        y: 45
      },
      recipientName: 'John Smith',
      specialInstructions: 'Please knock twice'
    },
    requirements: { capabilities: ['delivery', 'elevator-control'] },
    reward: 50,
    createdAt: Date.now()
  };

  await serviceBot.executeDelivery(deliveryTask);

  // Check status
  const status = serviceBot.getStatus();
  console.log('\n--- Robot Status ---');
  console.log(`Battery: ${status.batteryLevel.toFixed(1)}%`);
  console.log(`Location: Floor ${status.location?.floor}, (${status.location?.x}, ${status.location?.y})`);
  console.log(`Balance: ${status.balance} credits`);

  // Example: Execute a customer interaction
  console.log('\n--- Customer Greeting ---');
  
  const interactionTask = {
    id: 'task-002',
    type: 'interaction',
    status: 'assigned' as const,
    priority: 'normal' as const,
    publisherId: 'concierge-system',
    payload: {
      type: 'greeting',
      location: { x: 50, y: 10, floor: 1 },
      language: 'en',
      script: ['Welcome to our hotel!', 'How may I assist you today?']
    },
    requirements: { capabilities: ['customer-interaction', 'speech'] },
    reward: 10,
    createdAt: Date.now()
  };

  await serviceBot.executeInteraction(interactionTask);

  // Get interaction stats
  const stats = serviceBot.getInteractionStats();
  console.log(`\nTotal interactions: ${stats.totalInteractions}`);

  // Shutdown
  await serviceBot.stop();
  console.log('\n✨ Service robot shutdown complete');
}

// Run the example
main().catch(console.error);
