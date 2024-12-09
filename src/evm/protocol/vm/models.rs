use alloy_primitives::U256;
use strum_macros::Display;

use crate::protocol::errors::SimulationError;

#[derive(Eq, PartialEq, Hash, Debug, Display, Clone)]
pub enum Capability {
    SellSide = 1,
    BuySide = 2,
    PriceFunction = 3,
    FeeOnTransfer = 4,
    ConstantPrice = 5,
    TokenBalanceIndependent = 6,
    ScaledPrice = 7,
    HardLimits = 8,
    MarginalPrice = 9,
}

impl Capability {
    pub fn from_u256(value: U256) -> Result<Self, SimulationError> {
        let value_as_u8 = value.to_le_bytes::<32>()[0];
        match value_as_u8 {
            1 => Ok(Capability::SellSide),
            2 => Ok(Capability::BuySide),
            3 => Ok(Capability::PriceFunction),
            4 => Ok(Capability::FeeOnTransfer),
            5 => Ok(Capability::ConstantPrice),
            6 => Ok(Capability::TokenBalanceIndependent),
            7 => Ok(Capability::ScaledPrice),
            8 => Ok(Capability::HardLimits),
            9 => Ok(Capability::MarginalPrice),
            _ => {
                Err(SimulationError::FatalError(format!("Unexpected Capability value: {}", value)))
            }
        }
    }
}
