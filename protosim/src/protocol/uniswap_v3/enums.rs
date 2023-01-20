#[derive(Debug, Clone, Copy)]
pub enum FeeAmount {
    Lowest = 100,
    Low = 500,
    Medium = 3000,
    High = 10_000,
}
