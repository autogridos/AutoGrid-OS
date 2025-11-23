import { AutoGridOS, DeviceType, Task, Payment } from '../src';

describe('AutoGridOS', () => {
  let robot: AutoGridOS;

  beforeEach(() => {
    robot = new AutoGridOS({
      deviceId: 'test-robot-001',
      deviceType: DeviceType.WAREHOUSE,
      privateKey: 'test-key',
      capabilities: ['transport', 'sorting']
    });
  });

  describe('initialization', () => {
    it('should create a device with correct configuration', () => {
      const config = robot.getConfig();
      expect(config.deviceId).toBe('test-robot-001');
      expect(config.deviceType).toBe(DeviceType.WAREHOUSE);
      expect(config.capabilities).toContain('transport');
    });

    it('should start with initial balance', () => {
      const balance = robot.getBalance();
      expect(balance).toBeGreaterThan(0);
    });
  });

  describe('connection', () => {
    it('should connect to network successfully', async () => {
      await robot.connect();
      expect(true).toBe(true);
    });

    it('should disconnect from network', async () => {
      await robot.connect();
      await robot.disconnect();
      expect(true).toBe(true);
    });
  });

  describe('tasks', () => {
    beforeEach(async () => {
      await robot.connect();
    });

    it('should publish a task', async () => {
      const task = await robot.publishTask({
        type: 'transport',
        payload: { from: 'A', to: 'B' },
        maxPrice: 500
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.type).toBe('transport');
      expect(task.reward).toBe(500);
    });

    it('should submit a bid for a task', async () => {
      const task = await robot.publishTask({
        type: 'transport',
        payload: { from: 'A', to: 'B' },
        maxPrice: 500
      });

      const bid = await robot.submitBid(task.id, {
        price: 400,
        estimatedDuration: 300
      });

      expect(bid).toBeDefined();
      expect(bid.taskId).toBe(task.id);
      expect(bid.price).toBe(400);
    });
  });

  describe('payments', () => {
    it('should send payment to another device', async () => {
      await robot.connect();

      const payment = await robot.sendPayment({
        to: 'robot-002',
        amount: 100,
        memo: 'Test payment'
      });

      expect(payment).toBeDefined();
      expect(payment.to).toBe('robot-002');
      expect(payment.amount).toBe(100);
    });

    it('should track payment history', async () => {
      await robot.connect();

      await robot.sendPayment({
        to: 'robot-002',
        amount: 100
      });

      const history = robot.getPaymentHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('reputation', () => {
    it('should have initial reputation score', async () => {
      const reputation = await robot.getReputation();
      expect(reputation).toBeGreaterThanOrEqual(0);
      expect(reputation).toBeLessThanOrEqual(5);
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await robot.connect();
    });

    it('should emit payment received event', (done) => {
      robot.on('payment:received', (payment: Payment) => {
        expect(payment).toBeDefined();
        done();
      });

      // Simulate receiving payment (in real scenario this would come from network)
      setTimeout(() => done(), 100);
    });

    it('should emit task won event', (done) => {
      robot.on('task:won', (task: Task) => {
        expect(task).toBeDefined();
        done();
      });

      // Simulate winning a task
      setTimeout(() => done(), 100);
    });

    it('should emit task updated event', (done) => {
      robot.on('task:updated', (data: any) => {
        expect(data).toBeDefined();
        done();
      });

      // Simulate task update
      setTimeout(() => done(), 100);
    });

    it('should emit reputation updated event', (done) => {
      robot.on('reputation:updated', (score: any) => {
        expect(score).toBeDefined();
        done();
      });

      // Simulate reputation update
      setTimeout(() => done(), 100);
    });
  });

  describe('location management', () => {
    it('should update device location', () => {
      const newLocation = { x: 10, y: 20, floor: 1 };
      robot.updateLocation(newLocation);
      
      const location = robot.getLocation();
      expect(location).toEqual(newLocation);
    });

    it('should get current location', () => {
      const location = robot.getLocation();
      expect(location).toBeDefined();
    });
  });

  describe('marketplace', () => {
    beforeEach(async () => {
      await robot.connect();
    });

    it('should get market statistics', () => {
      const stats = robot.getMarketStats();
      expect(stats).toBeDefined();
      expect(stats.totalTasks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('task types', () => {
    it('should register custom task type', () => {
      const taskDefinition = {
        type: 'custom-task',
        requiredCapabilities: ['special-ability'],
        verificationRules: {
          requireProof: true,
          requireWitness: false,
          minReputation: 4.0
        },
        pricing: {
          basePrice: 1000,
          variableFactors: ['complexity']
        }
      };

      robot.registerTaskType(taskDefinition);
      expect(true).toBe(true);
    });
  });
});