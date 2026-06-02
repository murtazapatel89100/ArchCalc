use crate::calculator::ast::Expr;
use crate::calculator::tokenizer::Token;
use crate::errors::CalculatorError;
use std::iter::Peekable;
use std::vec::IntoIter;

pub struct Parser {
    tokens: Peekable<IntoIter<Token>>,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Parser {
            tokens: tokens.into_iter().peekable(),
        }
    }

    pub fn parse(&mut self) -> Result<Expr, CalculatorError> {
        let expr = self.parse_expression()?;
        if self.tokens.peek().is_some() {
            return Err(CalculatorError::ParseError(
                "Unexpected tokens at end of expression".to_string(),
            ));
        }
        Ok(expr)
    }

    fn parse_expression(&mut self) -> Result<Expr, CalculatorError> {
        self.parse_add_sub()
    }

    fn parse_add_sub(&mut self) -> Result<Expr, CalculatorError> {
        let mut left = self.parse_mul_div()?;

        while let Some(token) = self.tokens.peek() {
            match token {
                Token::Plus => {
                    self.tokens.next();
                    let right = self.parse_mul_div()?;
                    left = Expr::Add(Box::new(left), Box::new(right));
                }
                Token::Minus => {
                    self.tokens.next();
                    let right = self.parse_mul_div()?;
                    left = Expr::Subtract(Box::new(left), Box::new(right));
                }
                _ => break,
            }
        }

        Ok(left)
    }

    fn parse_mul_div(&mut self) -> Result<Expr, CalculatorError> {
        let mut left = self.parse_power()?;

        while let Some(token) = self.tokens.peek() {
            match token {
                Token::Multiply => {
                    self.tokens.next();
                    let right = self.parse_power()?;
                    left = Expr::Multiply(Box::new(left), Box::new(right));
                }
                Token::Divide => {
                    self.tokens.next();
                    let right = self.parse_power()?;
                    left = Expr::Divide(Box::new(left), Box::new(right));
                }
                _ => break,
            }
        }

        Ok(left)
    }

    fn parse_power(&mut self) -> Result<Expr, CalculatorError> {
        let left = self.parse_unary()?;

        if let Some(Token::Power) = self.tokens.peek() {
            self.tokens.next();
            // Power is usually right-associative
            let right = self.parse_power()?;
            return Ok(Expr::Power(Box::new(left), Box::new(right)));
        }

        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<Expr, CalculatorError> {
        if let Some(token) = self.tokens.peek() {
            match token {
                Token::Minus => {
                    self.tokens.next();
                    let expr = self.parse_unary()?;
                    return Ok(Expr::Negate(Box::new(expr)));
                }
                Token::Function(name) => {
                    let func_name = name.clone();
                    self.tokens.next(); // consume function name
                                        // Expect left paren, or just evaluate next token? Usually sin(x) requires parens.
                    if let Some(Token::LeftParen) = self.tokens.peek() {
                        self.tokens.next();
                        let expr = self.parse_expression()?;
                        if let Some(Token::RightParen) = self.tokens.next() {
                            return Ok(Expr::Function(func_name, Box::new(expr)));
                        } else {
                            return Err(CalculatorError::ParseError(
                                "Expected ')' after function argument".to_string(),
                            ));
                        }
                    } else {
                        return Err(CalculatorError::ParseError(
                            "Expected '(' after function name".to_string(),
                        ));
                    }
                }
                _ => {}
            }
        }

        self.parse_primary()
    }

    fn parse_primary(&mut self) -> Result<Expr, CalculatorError> {
        if let Some(token) = self.tokens.next() {
            match token {
                Token::Number(n) => Ok(Expr::Number(n)),
                Token::LeftParen => {
                    let expr = self.parse_expression()?;
                    if let Some(Token::RightParen) = self.tokens.next() {
                        Ok(expr)
                    } else {
                        Err(CalculatorError::ParseError(
                            "Expected closing parenthesis".to_string(),
                        ))
                    }
                }
                _ => Err(CalculatorError::ParseError(format!(
                    "Unexpected token: {:?}",
                    token
                ))),
            }
        } else {
            Err(CalculatorError::ParseError(
                "Unexpected end of expression".to_string(),
            ))
        }
    }
}
