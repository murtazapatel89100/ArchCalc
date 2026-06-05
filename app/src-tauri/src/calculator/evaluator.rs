use crate::calculator::ast::Expr;
use crate::errors::CalculatorError;


pub fn evaluate_expr(expr: &Expr) -> Result<f64, CalculatorError> {
    match expr {
        Expr::Number(n) => Ok(*n),
        Expr::Add(left, right) => Ok(evaluate_expr(left)? + evaluate_expr(right)?),
        Expr::Subtract(left, right) => Ok(evaluate_expr(left)? - evaluate_expr(right)?),
        Expr::Multiply(left, right) => Ok(evaluate_expr(left)? * evaluate_expr(right)?),
        Expr::Divide(left, right) => {
            let right_val = evaluate_expr(right)?;
            if right_val == 0.0 {
                return Err(CalculatorError::DivisionByZero);
            }
            Ok(evaluate_expr(left)? / right_val)
        }
        Expr::Power(left, right) => {
            let base = evaluate_expr(left)?;
            let exp = evaluate_expr(right)?;
            Ok(base.powf(exp))
        }
        Expr::Negate(inner) => Ok(-evaluate_expr(inner)?),
        Expr::Function(name, inner) => {
            let val = evaluate_expr(inner)?;
            match name.as_str() {
                "sin" => Ok(val.sin()),
                "cos" => Ok(val.cos()),
                "tan" => Ok(val.tan()),
                "asin" => Ok(val.asin()),
                "acos" => Ok(val.acos()),
                "atan" => Ok(val.atan()),
                "sqrt" => {
                    if val < 0.0 {
                        Err(CalculatorError::MathError(
                            "Cannot take square root of negative number".to_string(),
                        ))
                    } else {
                        Ok(val.sqrt())
                    }
                }
                "log" | "log10" => Ok(val.log10()),
                "ln" => Ok(val.ln()),
                "abs" => Ok(val.abs()),
                "exp" => Ok(val.exp()),
                _ => Err(CalculatorError::ParseError(format!(
                    "Unknown function: {}",
                    name
                ))),
            }
        }
    }
}
