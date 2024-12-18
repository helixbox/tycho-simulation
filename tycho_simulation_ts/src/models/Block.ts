import { HexString } from '../types';

export class EVMBlock {
  constructor(
    public readonly id: number,
    public readonly hash: HexString,
    public readonly timestamp: Date = new Date()
  ) {}

  clone(): EVMBlock {
    return new EVMBlock(this.id, this.hash, new Date(this.timestamp));
  }

  toString(): string {
    return `Block(${this.id}, ${this.hash})`;
  }

  equals(other: EVMBlock): boolean {
    return this.id === other.id && this.hash === other.hash;
  }
}