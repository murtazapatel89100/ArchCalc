use crate::calculator::evaluator::evaluate_expr;
use crate::calculator::parser::Parser;
use crate::calculator::tokenizer::tokenize;
use crate::errors::CalculatorError;
use crate::models::history::HistoryItem;
use crate::storage::history_store::add_history_item;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

#[tauri::command]
pub fn evaluate(expression: String, app_handle: AppHandle) -> Result<String, CalculatorError> {
    // 1. Tokenize
    let tokens = tokenize(&expression)?;

    // 2. Parse
    let mut parser = Parser::new(tokens);
    let ast = parser.parse()?;

    // 3. Evaluate
    let result_val = evaluate_expr(&ast)?;

    // Format the result (e.g. drop .0 if it's an integer)
    let result_str = if result_val.fract() == 0.0 {
        format!("{:.0}", result_val)
    } else {
        format!("{}", result_val)
    };

    // 4. Save to history
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let item = HistoryItem {
        expression: expression.clone(),
        result: result_str.clone(),
        timestamp,
    };

    let _ = add_history_item(&app_handle, item); // Ignore errors saving history

    Ok(result_str)
}
