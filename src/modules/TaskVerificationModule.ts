import { v4 as uuidv4 } from 'uuid';
import { Proof } from '../types';

export interface TaskVerificationConfig {
  deviceId?: string;
  zkEnabled?: boolean;
}

export class TaskVerificationModule {
  private deviceId?: string;
  private zkEnabled: boolean;
  private proofCache: Map<string, Proof> = new Map();

  constructor(config: TaskVerificationConfig = {}) {
    this.deviceId = config.deviceId;
    this.zkEnabled = config.zkEnabled !== false;
  }

  async generateProof(params: {
    taskId: string;
    result: any;
    parameters: Record<string, any>;
    deviceId?: string;
  }): Promise<Proof> {
    const deviceId = params.deviceId || this.deviceId;
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    const proofData = this.zkEnabled
      ? await this.generateZKProof(params)
      : this.generateSimpleProof(params);

    const proof: Proof = {
      id: uuidv4(),
      taskId: params.taskId,
      deviceId,
      proofData,
      timestamp: Date.now(),
      verified: false
    };

    this.proofCache.set(proof.id, proof);
    return proof;
  }

  async verifyProof(proof: Proof): Promise<boolean> {
    try {
      const isValid = this.zkEnabled
        ? await this.verifyZKProof(proof)
        : this.verifySimpleProof(proof);

      if (isValid) {
        const cachedProof = this.proofCache.get(proof.id);
        if (cachedProof) {
          cachedProof.verified = true;
        }
      }

      return isValid;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }

  async generateExecutionProof(params: {
    taskId: string;
    steps: Array<{ step: string; result: any; timestamp: number }>;
    finalResult: any;
  }): Promise<string> {
    const executionTrace = {
      taskId: params.taskId,
      steps: params.steps,
      finalResult: params.finalResult,
      totalSteps: params.steps.length,
      duration: params.steps.length > 0
        ? params.steps[params.steps.length - 1].timestamp - params.steps[0].timestamp
        : 0,
      hash: this.hashData(JSON.stringify(params))
    };

    return Buffer.from(JSON.stringify(executionTrace)).toString('base64');
  }

  async verifyExecutionProof(proofData: string): Promise<boolean> {
    try {
      const trace = JSON.parse(Buffer.from(proofData, 'base64').toString());
      const recomputedHash = this.hashData(
        JSON.stringify({
          taskId: trace.taskId,
          steps: trace.steps,
          finalResult: trace.finalResult
        })
      );
      return recomputedHash === trace.hash;
    } catch {
      return false;
    }
  }

  getProof(proofId: string): Proof | undefined {
    return this.proofCache.get(proofId);
  }

  clearCache(): void {
    this.proofCache.clear();
  }

  private async generateZKProof(params: {
    taskId: string;
    result: any;
    parameters: Record<string, any>;
  }): Promise<string> {
    const commitment = this.hashData(JSON.stringify(params.result));
    const witness = this.hashData(
      JSON.stringify({
        taskId: params.taskId,
        parameters: params.parameters,
        timestamp: Date.now()
      })
    );

    const zkProof = {
      commitment,
      witness,
      publicInputs: {
        taskId: params.taskId,
        timestamp: Date.now()
      },
      proof: this.generateProofString(commitment, witness)
    };

    return Buffer.from(JSON.stringify(zkProof)).toString('base64');
  }

  private async verifyZKProof(proof: Proof): Promise<boolean> {
    try {
      const zkProof = JSON.parse(Buffer.from(proof.proofData, 'base64').toString());
      const expectedProof = this.generateProofString(zkProof.commitment, zkProof.witness);
      return zkProof.proof === expectedProof && zkProof.publicInputs.taskId === proof.taskId;
    } catch {
      return false;
    }
  }

  private generateSimpleProof(params: {
    taskId: string;
    result: any;
    parameters: Record<string, any>;
  }): string {
    const proofData = {
      taskId: params.taskId,
      resultHash: this.hashData(JSON.stringify(params.result)),
      parametersHash: this.hashData(JSON.stringify(params.parameters)),
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  private verifySimpleProof(proof: Proof): boolean {
    try {
      const proofData = JSON.parse(Buffer.from(proof.proofData, 'base64').toString());
      return proofData.taskId === proof.taskId && proofData.timestamp > 0;
    } catch {
      return false;
    }
  }

  private hashData(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private generateProofString(commitment: string, witness: string): string {
    return this.hashData(`${commitment}:${witness}`);
  }
}