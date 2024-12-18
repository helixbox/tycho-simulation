import { getAddress, ZeroAddress, formatUnits, parseUnits } from 'ethers';
import Decimal from 'decimal.js';
import { Address } from '../types';

export class EthereumToken {
  private _hash: number | null = null;
  public readonly checksumAddress: Address;

  constructor(
    public readonly symbol: string,
    address: Address,
    public readonly decimals: number,
    public readonly gas: number | number[] = 29000,
    private readonly _chainId: number = 1
  ) {
    if (!address || address === ZeroAddress) {
      throw new Error('Invalid token address');
    }
    this.checksumAddress = getAddress(address);
  }

  toOnchainAmount(amount: number | string | Decimal): bigint {
    const decimalAmount = new Decimal(amount.toString());
    if (decimalAmount.isNegative()) {
      throw new Error('Amount cannot be negative');
    }

    const stringAmount = decimalAmount.toFixed(this.decimals);
    try {
      return parseUnits(stringAmount, this.decimals);
    } catch (error) {
      throw new Error(`Failed to convert amount: ${error.message}`);
    }
  }

  fromOnchainAmount(onchainAmount: bigint, quantize: boolean = true): Decimal {
    const stringAmount = formatUnits(onchainAmount, this.decimals);
    const result = new Decimal(stringAmount);
    return quantize ? result.toDecimalPlaces(this.decimals) : result;
  }

  get hash(): number {
    if (this._hash === null) {
      this._hash = Buffer.from(this.checksumAddress.slice(2), 'hex').readInt32BE(0);
    }
    return this._hash;
  }

  get address(): Address {
    return this.checksumAddress;
  }

  get chainId(): number {
    return this._chainId;
  }

  equals(other: EthereumToken): boolean {
    return this.checksumAddress === other.checksumAddress && 
           this.chainId === other.chainId;
  }

  toString(): string {
    return `${this.symbol}(${this.checksumAddress})`;
  }
}