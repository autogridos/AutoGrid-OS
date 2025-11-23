import { AutoGridOS, DeviceType, Task } from '../src';

async function basicExample() {
  const robot = new AutoGridOS({
    deviceId: 'robot-001',
    deviceType: DeviceType.SERVICE,
    privateKey: 'my-secret-key',
    capabilities: ['cleaning', 'monitoring']
  });

  await robot.connect();
  console.log('✓ Connected to AutoGrid network');

  robot.onTaskAvailable((task: Task) => {
    console.log(`New task: ${task.type}, Reward: ${task.reward}`);
    
    robot.submitBid(task.id, {
      price: 100,
      estimatedDuration: 300
    });
  });

  robot.onTaskAssigned(async (task: Task) => {
    console.log(`Executing task: ${task.id}`);
    
    const result = { completed: true, timestamp: Date.now() };
    
    await robot.submitProof(task.id, result);
    console.log(`✓ Task completed! Balance: ${robot.getBalance()}`);
  });

  const task = await robot.publishTask({
    type: 'cleaning',
    payload: { area: 'lobby', size: 100 },
    maxPrice: 500
  });

  console.log(`✓ Published task: ${task.id}`);
}

basicExample().catch(console.error);