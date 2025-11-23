import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../types';

export interface PaymentModuleConfig {
  deviceId: string;
  privateKey: string;
  initialBalance?: number;
}

export class PaymentModule extends EventEmitter {
  private deviceId: string;
  private privateKey: string;
  private balance: number;
  private paymentHistory: Payment[] = [];
  private channels: Map<string, PaymentChannel> = new Map();

  constructor(config: PaymentModuleConfig) {
    super();
    this.deviceId = config.deviceId;
    this.privateKey = config.privateKey;
    this.balance = config.initialBalance || 0;
  }

  async send(params: {
    to: string;
    amount: number;
    memo?: string;
  }): Promise<Payment> {
    if (this.balance < params.amount) {
      throw new Error('Insufficient balance');
    }

    const payment: Payment = {
      id: uuidv4(),
      from: this.deviceId,
      to: params.to,
      amount: params.amount,
      memo: params.memo,
      timestamp: Date.now(),
      proof: this.generatePaymentProof(params)
    };

    this.balance -= params.amount;
    this.paymentHistory.push(payment);

    this.emit('payment:sent', payment);

    return payment;
  }

  async receive(payment: Payment): Promise<void> {
    if (!this.verifyPaymentProof(payment)) {
      throw new Error('Invalid payment proof');
    }

    this.balance += payment.amount;
    this.paymentHistory.push(payment);

    this.emit('payment:received', payment);
  }

  async openChannel(params: {
    counterparty: string;
    initialDeposit: number;
    duration?: number;
  }): Promise<PaymentChannel> {
    if (this.balance < params.initialDeposit) {
      throw new Error('Insufficient balance for channel deposit');
    }

    const channel = new PaymentChannel({
      id: uuidv4(),
      participants: [this.deviceId, params.counterparty],
      balance: params.initialDeposit,
      duration: params.duration || 86400000,
      createdAt: Date.now()
    });

    this.balance -= params.initialDeposit;
    this.channels.set(channel.id, channel);

    this.emit('channel:opened', channel);

    return channel;
  }

  async closeChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const settlement = channel.close();
    this.balance += settlement;

    this.channels.delete(channelId);
    this.emit('channel:closed', { channelId, settlement });
  }

  getBalance(): number {
    return this.balance;
  }

  getHistory(limit?: number): Payment[] {
    return limit 
      ? this.paymentHistory.slice(-limit)
      : [...this.paymentHistory];
  }

  addFunds(amount: number): void {
    this.balance += amount;
    this.emit('balance:updated', this.balance);
  }

  private generatePaymentProof(params: {
    to: string;
    amount: number;
    memo?: string;
  }): string {
    const proofData = {
      from: this.deviceId,
      to: params.to,
      amount: params.amount,
      timestamp: Date.now(),
      signature: this.sign(`${params.to}:${params.amount}`)
    };

    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  private verifyPaymentProof(payment: Payment): boolean {
    try {
      if (!payment.proof) return false;
      
      const proofData = JSON.parse(
        Buffer.from(payment.proof, 'base64').toString()
      );

      return proofData.from === payment.from &&
             proofData.to === payment.to &&
             proofData.amount === payment.amount;
    } catch {
      return false;
    }
  }

  private sign(data: string): string {
    return Buffer.from(`${this.privateKey}:${data}`).toString('base64');
  }
}

export class PaymentChannel {
  id: string;
  participants: string[];
  balance: number;
  duration: number;
  createdAt: number;
  private transactions: Array<{ amount: number; timestamp: number }> = [];

  constructor(params: {
    id: string;
    participants: string[];
    balance: number;
    duration: number;
    createdAt: number;
  }) {
    this.id = params.id;
    this.participants = params.participants;
    this.balance = params.balance;
    this.duration = params.duration;
    this.createdAt = params.createdAt;
  }

  transact(amount: number): void {
    if (this.balance < amount) {
      throw new Error('Insufficient channel balance');
    }

    this.balance -= amount;
    this.transactions.push({ amount, timestamp: Date.now() });
  }

  close(): number {
    return this.balance;
  }

  getStats() {
    return {
      totalTransactions: this.transactions.length,
      totalVolume: this.transactions.reduce((sum, tx) => sum + tx.amount, 0),
      remainingBalance: this.balance,
      age: Date.now() - this.createdAt
    };
  }
}