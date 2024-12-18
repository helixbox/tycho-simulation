export type Address = string;
export type HexString = string;

export interface AccountInfo {
  balance: bigint;
  nonce: number;
  code: Buffer | null;
}

export interface AccountUpdate {
  address: Address;
  chain: string;
  slots: Record<number, number>;
  balance: bigint | null;
  code: Buffer | null;
  change: boolean;
}

export interface StateUpdate {
  address: Address;
  slots: Record<number, bigint>;
}

export interface SimulationResult {
  returnValue: Buffer;
  gasUsed: number;
  stateUpdates: StateUpdate[];
}

export enum Blockchain {
  Ethereum = "ethereum",
  Arbitrum = "arbitrum",
  Polygon = "polygon",
  Zksync = "zksync",
}

export enum Capability {
  SellSide,
  BuySide,
  PriceFunction,
  FeeOnTransfer,
  ConstantPrice,
  TokenBalanceIndependent,
  ScaledPrices,
  HardLimits,
  MarginalPrice,
}

export enum ContractCompiler {
  Solidity,
  Vyper,
}
