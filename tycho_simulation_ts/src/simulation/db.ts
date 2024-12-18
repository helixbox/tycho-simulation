import { Address } from '../types';

export interface StorageSlot {
  key: bigint;
  value: bigint;
}

export interface AccountState {
  nonce: number;
  balance: bigint;
  code: Uint8Array | null;
  storage: Map<bigint, bigint>;
}

export class TychoDB {
  private accounts: Map<Address, AccountState>;
  private snapshots: AccountState[][];

  constructor() {
    this.accounts = new Map();
    this.snapshots = [];
  }

  setAccount(address: Address, state: AccountState): void {
    this.accounts.set(address, state);
  }

  getAccount(address: Address): AccountState | undefined {
    return this.accounts.get(address);
  }

  snapshot(): number {
    const currentState = Array.from(this.accounts.values());
    this.snapshots.push(currentState);
    return this.snapshots.length - 1;
  }

  revert(id: number): boolean {
    const snapshot = this.snapshots[id];
    if (!snapshot) return false;
    
    this.accounts.clear();
    snapshot.forEach(state => {
      this.accounts.set(state.nonce.toString() as Address, state);
    });
    
    this.snapshots = this.snapshots.slice(0, id);
    return true;
  }
}