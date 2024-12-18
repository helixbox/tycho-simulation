import { getAddress } from 'ethers';
import { EVMBlock } from '../models/Block';
import { EthereumToken } from '../models/Token';
import { ThirdPartyPool } from '../pools/ThirdPartyPool';
import { TychoDecoder, ComponentWithState, TychoDecodeError } from './TychoDecoder';
import { SimulationEngine } from '../simulation/engine';

export class ThirdPartyPoolDecoder extends TychoDecoder {
  constructor(
    engine: SimulationEngine,
    private readonly tokenRegistry: Map<string, EthereumToken>
  ) {
    super(engine);
  }

  async decodeSnapshot(
    snapshot: ComponentWithState,
    block: EVMBlock
  ): Promise<Record<string, ThirdPartyPool>> {
    const pools: Record<string, ThirdPartyPool> = {};
    
    try {
      const pool = await this.decodePoolState(snapshot, block);
      pools[getAddress(snapshot.address)] = pool;
    } catch (error) {
      if (error instanceof TychoDecodeError) {
        this.ignoredPools.add(error.poolId);
      }
      throw error;
    }

    return pools;
  }

  async decodePoolState(
    snapshot: ComponentWithState,
    block: EVMBlock
  ): Promise<ThirdPartyPool> {
    if (this.ignoredPools.has(snapshot.address)) {
      throw new TychoDecodeError('Pool is ignored', snapshot.address);
    }

    return this.parseState(snapshot.state, block);
  }

  protected async parseState(
    state: Record<string, any>,
    block: EVMBlock
  ): Promise<ThirdPartyPool> {
    const address = getAddress(state.address);
    
    // Validate required state fields
    if (!state.token0 || !state.token1) {
      throw new TychoDecodeError('Missing token addresses', address);
    }

    const token0 = this.tokenRegistry.get(getAddress(state.token0));
    const token1 = this.tokenRegistry.get(getAddress(state.token1));

    if (!token0 || !token1) {
      throw new TychoDecodeError('Unknown token', address);
    }

    return new ThirdPartyPool(
      address,
      [token0, token1],
      this.engine,
      block
    );
  }
}