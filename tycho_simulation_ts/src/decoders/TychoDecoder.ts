import { EVMBlock } from '../models/Block';
import { ThirdPartyPool } from '../pools/ThirdPartyPool';
import { SimulationEngine } from '../simulation/engine';

export interface ComponentWithState {
  address: string;
  state: Record<string, any>;
}

export interface BlockChanges {
  blockNumber: number;
  changes: Array<{
    address: string;
    updates: Record<string, any>;
  }>;
}

export class TychoDecodeError extends Error {
  constructor(
    message: string,
    public readonly poolId: string
  ) {
    super(`Error decoding pool ${poolId}: ${message}`);
    this.name = 'TychoDecodeError';
  }
}

export abstract class TychoDecoder {
  protected ignoredPools: Set<string> = new Set();
  protected engine: SimulationEngine;

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  abstract decodeSnapshot(
    snapshot: ComponentWithState,
    block: EVMBlock
  ): Promise<Record<string, ThirdPartyPool>>;

  abstract decodePoolState(
    snapshot: ComponentWithState,
    block: EVMBlock
  ): Promise<ThirdPartyPool>;

  protected abstract parseState(
    state: Record<string, any>,
    block: EVMBlock
  ): Promise<ThirdPartyPool>;
}