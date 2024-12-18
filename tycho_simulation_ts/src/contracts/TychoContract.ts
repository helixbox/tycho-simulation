import { Interface, AbiCoder, getAddress } from 'ethers';
import { SimulationEngine } from '../simulation/engine';
import { Address } from '../types';
import { AdapterContract } from './AdapterContract';

export class TychoContract extends AdapterContract {
  private slots: Map<string, number>;

  constructor(
    address: Address,
    engine: SimulationEngine,
    protected readonly contractAbi: Interface
  ) {
    super(address, engine, contractAbi);
    this.slots = new Map();
  }

  async callStatic(
    method: string,
    args: any[],
    overrides: Record<Address, Record<number, bigint>> = {}
  ): Promise<any> {
    const data = this.contractAbi.encodeFunctionData(method, args);
    
    const result = await this.engine.simulate({
      data: Buffer.from(data.slice(2), 'hex'),
      to: this.address,
      blockNumber: 0,
      overrides
    });

    return this.contractAbi.decodeFunctionResult(method, result.returnValue);
  }

  async detectSlot(key: string, value: bigint): Promise<number> {
    const cachedSlot = this.slots.get(key);
    if (cachedSlot !== undefined) {
      return cachedSlot;
    }

    // Slot detection logic
    for (let slot = 0; slot < 100; slot++) {
      const overrides = {
        [this.address]: { [slot]: value }
      };

      try {
        await this.callStatic('detect', [], overrides);
        this.slots.set(key, slot);
        return slot;
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Failed to detect slot for ${key}`);
  }
}