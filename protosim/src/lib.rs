pub mod models;
pub mod protocol;
mod u256_num;

pub fn birth() {
    let random_quote = "The way I see it, there's only three kinds of people in this world: \
        Bad ones, ones you follow, and ones you need to protect.\n\
        \n\
        Amos Burton";
    println!("{}", random_quote)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_birth() {
        birth();
    }
}
