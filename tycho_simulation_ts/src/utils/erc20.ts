import { Interface, AbiCoder, getAddress } from 'ethers';
import { EthereumToken } from '../models/Token';
import { SimulationEngine } from '../simulation/engine';
import { Address } from '../types';

export interface ERC20Slots {
  balanceOf: number;
  allowance: number;
  totalSupply: number;
}

export class ERC20OverwriteFactory {
  private static readonly ERC20_ABI = new Interface([
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function totalSupply() view returns (uint256)'
  ]);

  constructor(
    private readonly engine: SimulationEngine,
    private readonly slots: ERC20Slots
  ) {}

  createBalanceOverride(
    token: Address,
    holder: Address,
    balance: bigint
  ): Record<Address, Record<number, bigint>> {
    return {
      [getAddress(token)]: {
        [(BigInt(this.slots.balanceOf) + BigInt(holder)).toString()]: balance
      }
    };
  }

  createAllowanceOverride(
    token: Address,
    owner: Address,
    spender: Address,
    amount: bigint
  ): Record<Address, Record<number, bigint>> {
    const slot = BigInt(this.slots.allowance) + 
                 BigInt(owner) +
                 BigInt(spender);
    return {
      [getAddress(token)]: { [slot.toString()]: amount }
    };
  }
}

export async function detectERC20Slots(
  token: EthereumToken,
  engine: SimulationEngine
): Promise<ERC20Slots> {
  // Implement slot detection logic here
  return {
    balanceOf: 0,
    allowance: 1,
    totalSupply: 2
  };
}