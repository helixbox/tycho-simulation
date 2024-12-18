import { getAddress } from 'ethers';
import { EVMBlock } from '../models/Block';
import { Address } from '../types';

export function calculateGasLimit(
  baseCost: number,
  dataLength: number
): bigint {
  return BigInt(baseCost + (dataLength * 16));
}

export function encodeStorageSlot(
  slot: number,
  ...params: (string | number | bigint)[]
): bigint {
  const encoded = params.map(p => {
    if (typeof p === 'string') {
      return BigInt(getAddress(p).toLowerCase().replace('0x', ''));
    }
    return BigInt(p);
  });
  
  return BigInt(slot) + encoded.reduce(
    (acc: bigint, val: bigint) => acc + val, 
    BigInt(0)
  );
}

export class BlockNumber {
  static readonly LATEST = -1;
  static readonly EARLIEST = 0;
  
  static resolve(
    blockTag: number | 'latest' | 'earliest',
    currentBlock: EVMBlock
  ): number {
    if (blockTag === 'latest') return currentBlock.id;
    if (blockTag === 'earliest') return 0;
    return blockTag;
  }
}

export function maybeCoerceError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}