use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub expression: String,
    pub result: String,
    pub timestamp: i64,
}
