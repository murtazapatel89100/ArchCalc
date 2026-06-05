use serde::{Serialize, Serializer};

#[derive(Debug)]
pub enum CalculatorError {
    ParseError(String),
    InvalidExpression(String),
    DivisionByZero,
    MathError(String),
    IoError(String),
}

// Convert Error to String so Tauri can pass it to the frontend via IPC
impl Serialize for CalculatorError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl std::fmt::Display for CalculatorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CalculatorError::ParseError(msg) => write!(f, "Parse Error: {}", msg),
            CalculatorError::InvalidExpression(msg) => write!(f, "Invalid Expression: {}", msg),
            CalculatorError::DivisionByZero => write!(f, "Division by Zero"),
            CalculatorError::MathError(msg) => write!(f, "Math Error: {}", msg),
            CalculatorError::IoError(msg) => write!(f, "IO Error: {}", msg),
        }
    }
}

impl std::error::Error for CalculatorError {}

impl From<std::io::Error> for CalculatorError {
    fn from(err: std::io::Error) -> Self {
        CalculatorError::IoError(err.to_string())
    }
}
