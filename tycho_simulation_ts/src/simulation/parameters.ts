import { Address } from '../types';

export interface SimulationParameters {
  data: Uint8Array;
  to: Address;
  blockNumber: number;
  timestamp?: number;
  overrides?: Record<Address, Record<number, bigint>>;
  caller?: Address;
  value?: bigint;
  gasLimit?: bigint;
}

export interface BlockParameters {
  number: number;
  timestamp: number;
  baseFee?: bigint;
  prevRandao?: bigint;
}

export interface TransactionContext {
  origin: Address;
  gasPrice: bigint;
  blockParams: BlockParameters;
}