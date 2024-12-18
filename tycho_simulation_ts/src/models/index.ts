export enum Blockchain {
  Ethereum = "ethereum",
  Arbitrum = "arbitrum",
  Polygon = "polygon",
  Zksync = "zksync",
}

export enum Capability {
  SellSide = "SELL_SIDE",
  BuySide = "BUY_SIDE",
  PriceFunction = "PRICE_FUNCTION",
  FeeOnTransfer = "FEE_ON_TRANSFER",
  ConstantPrice = "CONSTANT_PRICE",
  TokenBalanceIndependent = "TOKEN_BALANCE_INDEPENDENT",
  ScaledPrices = "SCALED_PRICES",
  HardLimits = "HARD_LIMITS",
  MarginalPrice = "MARGINAL_PRICE",
}

export { EVMBlock } from "./Block";
export { EthereumToken } from "./Token";

export type Address = string;
export type HexString = string;
