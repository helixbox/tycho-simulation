use std::{
    collections::{HashMap, HashSet},
    env,
    str::FromStr,
};

use clap::Parser;
use futures::StreamExt;
use num_bigint::BigUint;
use tracing_subscriber::EnvFilter;
use tycho_core::Bytes;
use tycho_execution::encoding::{
    evm::{
        strategy_encoder::strategy_encoder_registry::EVMStrategyEncoderRegistry,
        tycho_encoder::EVMTychoEncoder,
    },
    models::{Solution, Swap},
    strategy_encoder::StrategyEncoderRegistry,
    tycho_encoder::TychoEncoder,
};
use tycho_simulation::{
    evm::{
        engine_db::tycho_db::PreCachedDB,
        protocol::{
            filters::{balancer_pool_filter, uniswap_v4_pool_with_hook_filter},
            uniswap_v2::state::UniswapV2State,
            uniswap_v3::state::UniswapV3State,
            uniswap_v4::state::UniswapV4State,
            vm::state::EVMPoolState,
        },
        stream::ProtocolStreamBuilder,
    },
    models::Token,
    protocol::models::{BlockUpdate, ProtocolComponent},
    tycho_client::feed::component_tracker::ComponentFilter,
    tycho_core::models::Chain,
    utils::load_all_tokens,
};

#[derive(Parser)]
struct Cli {
    #[arg(short, long, default_value = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")]
    sell_token: String,
    #[arg(short, long, default_value = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")]
    buy_token: String,
    #[arg(short, long, default_value_t = 1)]
    sell_amount: u32,
    /// The tvl threshold to filter the graph by
    #[arg(short, long, default_value_t = 100.0)]
    tvl_threshold: f64,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let tycho_url =
        env::var("TYCHO_URL").unwrap_or_else(|_| "tycho-beta.propellerheads.xyz".to_string());
    let tycho_api_key: String =
        env::var("TYCHO_API_KEY").unwrap_or_else(|_| "sampletoken".to_string());

    let cli = Cli::parse();
    let tvl_filter = ComponentFilter::with_tvl_range(cli.tvl_threshold, cli.tvl_threshold);

    let all_tokens = load_all_tokens(
        tycho_url.as_str(),
        false,
        Some(tycho_api_key.as_str()),
        Chain::Ethereum,
        None,
        None,
    )
    .await;

    let sell_token_address =
        Bytes::from_str(&cli.sell_token).expect("Invalid address for sell token");
    let buy_token_address = Bytes::from_str(&cli.buy_token).expect("Invalid address for buy token");
    let sell_token = all_tokens
        .get(&sell_token_address)
        .expect("Sell token not found")
        .clone();
    let buy_token = all_tokens
        .get(&buy_token_address)
        .expect("Buy token not found")
        .clone();
    let amount_in =
        BigUint::from(cli.sell_amount) * BigUint::from(10u32).pow(sell_token.decimals as u32);

    println!(
        "Looking for the best swap for {} {} -> {}",
        cli.sell_amount, sell_token.symbol, buy_token.symbol
    );
    let mut pairs: HashMap<String, ProtocolComponent> = HashMap::new();
    let mut amounts_out: HashMap<String, BigUint> = HashMap::new();

    let mut protocol_stream = ProtocolStreamBuilder::new(&tycho_url, Chain::Ethereum)
        .exchange::<UniswapV2State>("uniswap_v2", tvl_filter.clone(), None)
        .exchange::<UniswapV3State>("uniswap_v3", tvl_filter.clone(), None)
        .exchange::<EVMPoolState<PreCachedDB>>(
            "vm:balancer_v2",
            tvl_filter.clone(),
            Some(balancer_pool_filter),
        )
        .exchange::<UniswapV4State>(
            "uniswap_v4",
            tvl_filter.clone(),
            Some(uniswap_v4_pool_with_hook_filter),
        )
        .auth_key(Some(tycho_api_key.clone()))
        .skip_state_decode_failures(true)
        .set_tokens(all_tokens.clone())
        .await
        .build()
        .await
        .expect("Failed building protocol stream");

    // execution setup
    let router_address = "0x1234567890abcdef1234567890abcdef12345678".to_string();
    let signer_pk =
        Some("0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234".to_string());
    let user_address = Bytes::from_str("0xcd09f75E2BF2A4d11F3AB23f1389FcC1621c0cc2")
        .expect("Failed to create user address");

    // Initialize the encoder
    let strategy_encoder_registry =
        EVMStrategyEncoderRegistry::new(Chain::Ethereum, None, signer_pk.clone())
            .expect("Failed to create strategy encoder registry");
    let encoder = EVMTychoEncoder::new(strategy_encoder_registry, router_address)
        .expect("Failed to create encoder");

    while let Some(message) = protocol_stream.next().await {
        let message = message.expect("Could not receive message");
        let best_pool = get_best_swap(
            message,
            &mut pairs,
            amount_in.clone(),
            sell_token.clone(),
            buy_token.clone(),
            &mut amounts_out,
        );

        if let Some(best_pool) = best_pool {
            encode(
                encoder.clone(),
                &pairs,
                best_pool,
                sell_token.clone(),
                buy_token.clone(),
                amount_in.clone(),
                user_address.clone(),
            );
        }
    }
}

fn get_best_swap(
    message: BlockUpdate,
    pairs: &mut HashMap<String, ProtocolComponent>,
    amount_in: BigUint,
    sell_token: Token,
    buy_token: Token,
    amounts_out: &mut HashMap<String, BigUint>,
) -> Option<String> {
    println!("==================== Received block {:?} ====================", message.block_number);
    for (id, comp) in message.new_pairs.iter() {
        pairs
            .entry(id.clone())
            .or_insert_with(|| comp.clone());
    }
    if message.states.is_empty() {
        println!("No pools of interest were updated this block. The best swap is the previous one");
        return None;
    }
    for (id, state) in message.states.iter() {
        if let Some(component) = pairs.get(id) {
            let tokens = component.tokens.clone();
            if HashSet::from([&sell_token, &buy_token]) == HashSet::from([&tokens[0], &tokens[1]]) {
                let amount_out = state
                    .get_amount_out(amount_in.clone(), &sell_token, &buy_token)
                    .map_err(|e| {
                        eprintln!("Error calculating amount out for Pool {:?}: {:?}", id, e)
                    })
                    .ok();
                if let Some(amount_out) = amount_out {
                    amounts_out.insert(id.clone(), amount_out.amount);
                }
                // If you would like to save spot prices instead of the amount out, do
                // let spot_price = state
                //     .spot_price(&tokens[0], &tokens[1])
                //     .ok();
            }
        }
    }
    if let Some((key, amount_out)) = amounts_out
        .iter()
        .max_by_key(|(_, value)| value.to_owned())
    {
        println!(
            "Pool with the highest amount out: {} with {} (out of {} possible pools)",
            key,
            amount_out,
            amounts_out.len()
        );
        Some(key.to_string())
    } else {
        println!("There aren't pools with the tokens we are looking for");
        None
    }
}

fn encode(
    encoder: EVMTychoEncoder<EVMStrategyEncoderRegistry>,
    pairs: &HashMap<String, ProtocolComponent>,
    best_pool: String,
    sell_token: Token,
    buy_token: Token,
    sell_amount: BigUint,
    user_address: Bytes,
) {
    let component = pairs
        .get(&best_pool)
        .expect("Best pool not found")
        .clone();

    // Prepare data to encode. First we need to create a swap object
    let simple_swap = Swap::new(
        component,
        sell_token.address.clone(),
        buy_token.address.clone(),
        // Split defines the fraction of the amount to be swapped. A value of 0 indicates 100% of
        // the amount or the total remaining balance.
        0f64,
    );

    // Then we create a solution object with the previous swap
    let solution = Solution {
        sender: user_address.clone(),
        receiver: user_address,
        given_token: sell_token.address,
        given_amount: sell_amount,
        checked_token: buy_token.address,
        exact_out: false,   // it's an exact in solution
        check_amount: None, // the amount out will not be checked in execution
        swaps: vec![simple_swap],
        ..Default::default()
    };

    // Encode the solution
    let tx = encoder
        .encode_router_calldata(vec![solution.clone()])
        .expect("Failed to encode router calldata")[0]
        .clone();
    println!("The encoded transaction is:");
    println!("to: {:?}", tx.to);
    println!("value: {:?}", tx.value);
    println!("data: {:?}", hex::encode(tx.data));
}
