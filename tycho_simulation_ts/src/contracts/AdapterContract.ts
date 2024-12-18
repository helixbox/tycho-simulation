import { getAddress, AbiCoder, Contract, Interface } from 'ethers';
import { EVMBlock } from '../models/Block';
import { EthereumToken } from '../models/Token';
import { Address } from '../types';
import { SimulationEngine } from '../simulation/engine';
import Decimal from 'decimal.js';

export class AdapterContract {
  private readonly interface: Interface;
  private readonly abiCoder: AbiCoder;

  constructor(
    public readonly address: Address,
    protected readonly engine: SimulationEngine,
    abi: Interface
  ) {
    this.interface = abi;
    this.abiCoder = AbiCoder.defaultAbiCoder();
  }

  async price(
    pairId: string,
    sellToken: EthereumToken,
    buyToken: EthereumToken,
    amounts: Decimal[],
    block: EVMBlock,
    overwrites?: Record<Address, Record<number, bigint>>
  ): Promise<[Decimal, number][]> {
    const data = this.interface.encodeFunctionData('price', [
      pairId,
      sellToken.address,
      buyToken.address,
      amounts.map(a => sellToken.toOnchainAmount(a))
    ]);

    const result = await this.engine.simulate({
      data: Buffer.from(data.slice(2), 'hex'),
      to: this.address,
      blockNumber: block.id,
      overrides: overwrites
    });

    const decoded = this.interface.decodeFunctionResult('price', result.returnValue);
    return amounts.map((_, i) => [
      buyToken.fromOnchainAmount(decoded[0][i]),
      Number(decoded[1][i])
    ]);
  }
}