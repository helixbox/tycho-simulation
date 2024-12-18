import { Address } from '../types';
import { EVMBlock } from '../models/Block';
import { EthereumToken } from '../models/Token';
import Decimal from 'decimal.js';

export interface PoolBalance {
  token: EthereumToken;
  amount: Decimal;
  lastUpdate: number;
}

export interface PoolReserves {
  token0: bigint;
  token1: bigint;
  timestamp: number;
}

export class PoolState {
  private reserves: Map<Address, PoolBalance>;
  
  constructor(
    public readonly poolAddress: Address,
    public readonly block: EVMBlock,
    initialBalances?: Map<Address, PoolBalance>
  ) {
    this.reserves = initialBalances ?? new Map();
  }

  getBalance(token: EthereumToken): Decimal {
    const balance = this.reserves.get(token.address);
    return balance?.amount ?? new Decimal(0);
  }

  updateBalance(token: EthereumToken, amount: Decimal): void {
    this.reserves.set(token.address, {
      token,
      amount,
      lastUpdate: this.block.id
    });
  }

  clone(): PoolState {
    return new PoolState(
      this.poolAddress,
      this.block.clone(),
      new Map(this.reserves)
    );
  }
}