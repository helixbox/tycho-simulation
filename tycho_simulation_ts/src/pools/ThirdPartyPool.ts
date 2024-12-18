import Decimal from "decimal.js";
import { Address, Capability, SimulationResult } from "../types";
import { EVMBlock } from "../models/Block";
import { EthereumToken } from "../models/Token";
import { PoolState } from "./PoolState";
import { SimulationEngine } from "../simulation/engine";

export class ThirdPartyPool {
  protected state: PoolState;
  protected capabilities: Set<Capability>;

  constructor(
    public readonly id: string,
    public readonly tokens: EthereumToken[],
    protected readonly engine: SimulationEngine,
    block: EVMBlock,
    initialState?: PoolState
  ) {
    this.state = initialState ?? new PoolState(id, block);
    this.capabilities = new Set([Capability.SellSide]);
  }

  async getAmountOut(
    sellToken: EthereumToken,
    buyToken: EthereumToken,
    amount: Decimal
  ): Promise<[Decimal, number, ThirdPartyPool]> {
    this.validateTokens(sellToken, buyToken);

    const result = await this.simulateSwap(sellToken, buyToken, amount);
    const newState = this.updateStateFromSimulation(
      result,
      sellToken,
      buyToken,
      amount
    );

    const returnValueBigInt = BigInt(
      "0x" + Buffer.from(result.returnValue).toString("hex")
    );

    return [
      buyToken.fromOnchainAmount(returnValueBigInt),
      Number(result.gasUsed),
      this.withNewState(newState),
    ];
  }

  protected updateStateFromSimulation(
    result: SimulationResult,
    sellToken: EthereumToken,
    buyToken: EthereumToken,
    amount: Decimal
  ): PoolState {
    const newState = this.state.clone();

    // Update balances based on simulation results
    const sellAmount = sellToken.toOnchainAmount(amount);
    const buyAmount = BigInt(
      "0x" + Buffer.from(result.returnValue).toString("hex")
    );

    const currentSellBalance = this.state.getBalance(sellToken);
    const currentBuyBalance = this.state.getBalance(buyToken);

    newState.updateBalance(sellToken, currentSellBalance.add(amount));
    newState.updateBalance(
      buyToken,
      currentBuyBalance.sub(buyToken.fromOnchainAmount(buyAmount))
    );

    return newState;
  }

  protected validateTokens(
    sellToken: EthereumToken,
    buyToken: EthereumToken
  ): void {
    if (
      !this.tokens.some((t) => t.equals(sellToken)) ||
      !this.tokens.some((t) => t.equals(buyToken))
    ) {
      throw new Error("Invalid token pair");
    }
  }

  protected async simulateSwap(
    sellToken: EthereumToken,
    buyToken: EthereumToken,
    amount: Decimal
  ) {
    const data = this.encodeSwapData(sellToken, buyToken, amount);
    return await this.engine.simulate({
      data,
      to: this.id,
      blockNumber: this.state.block.id,
    });
  }

  protected withNewState(state: PoolState): ThirdPartyPool {
    return new ThirdPartyPool(
      this.id,
      this.tokens,
      this.engine,
      this.state.block,
      state
    );
  }

  protected encodeSwapData(
    sellToken: EthereumToken,
    buyToken: EthereumToken,
    amount: Decimal
  ): Uint8Array {
    throw new Error("Must be implemented by derived class");
  }
}
