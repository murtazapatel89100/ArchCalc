#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Number(f64),
    Add(Box<Expr>, Box<Expr>),
    Subtract(Box<Expr>, Box<Expr>),
    Multiply(Box<Expr>, Box<Expr>),
    Divide(Box<Expr>, Box<Expr>),
    Power(Box<Expr>, Box<Expr>),
    Negate(Box<Expr>),
    Function(String, Box<Expr>),
}
