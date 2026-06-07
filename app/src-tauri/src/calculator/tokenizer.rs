use crate::errors::CalculatorError;

#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    Number(f64),
    Plus,
    Minus,
    Multiply,
    Divide,
    Power,
    LeftParen,
    RightParen,
    Function(String),
}

pub fn tokenize(input: &str) -> Result<Vec<Token>, CalculatorError> {
    let mut tokens = Vec::new();
    let mut chars = input.chars().peekable();

    while let Some(&c) = chars.peek() {
        match c {
            ' ' | '\t' | '\n' | '\r' => {
                chars.next();
            }
            '+' => {
                tokens.push(Token::Plus);
                chars.next();
            }
            '-' => {
                tokens.push(Token::Minus);
                chars.next();
            }
            '*' => {
                tokens.push(Token::Multiply);
                chars.next();
            }
            '/' => {
                tokens.push(Token::Divide);
                chars.next();
            }
            '^' => {
                tokens.push(Token::Power);
                chars.next();
            }
            '(' => {
                tokens.push(Token::LeftParen);
                chars.next();
            }
            ')' => {
                tokens.push(Token::RightParen);
                chars.next();
            }
            '0'..='9' | '.' => {
                let mut num_str = String::new();
                while let Some(&ch) = chars.peek() {
                    if ch.is_ascii_digit() || ch == '.' {
                        num_str.push(ch);
                        chars.next();
                    } else {
                        break;
                    }
                }
                let num = num_str.parse::<f64>().map_err(|_| {
                    CalculatorError::ParseError(format!("Invalid number: {}", num_str))
                })?;
                tokens.push(Token::Number(num));
            }
            'a'..='z' | 'A'..='Z' => {
                let mut func_str = String::new();
                while let Some(&ch) = chars.peek() {
                    if ch.is_ascii_alphabetic() {
                        func_str.push(ch);
                        chars.next();
                    } else {
                        break;
                    }
                }
                tokens.push(Token::Function(func_str.to_lowercase()));
            }
            _ => {
                return Err(CalculatorError::ParseError(format!(
                    "Unexpected character: {}",
                    c
                )));
            }
        }
    }

    Ok(tokens)
}
