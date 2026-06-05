use serde::Serialize;
use sysinfo::{System, Networks};
use tauri::State;
use std::sync::Mutex;

pub struct SystemState {
    pub sys: Mutex<System>,
    pub networks: Mutex<Networks>,
}

impl SystemState {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_cpu_usage(); // Need to call it once to prime the CPU usage
        let mut networks = Networks::new_with_refreshed_list();
        networks.refresh();

        Self {
            sys: Mutex::new(sys),
            networks: Mutex::new(networks),
        }
    }
}

impl Default for SystemState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Serialize)]
pub struct SystemInfo {
    cpu_usage: f32,
    cpu_cores: usize,
    ram_used: u64,
    ram_total: u64,
    swap_used: u64,
    swap_total: u64,
    net_rx: u64,
    net_tx: u64,
    os_name: String,
    kernel: String,
    uptime: u64,
}

#[tauri::command]
pub fn get_system_info(state: State<'_, SystemState>) -> SystemInfo {
    let mut sys = state.sys.lock().unwrap();
    let mut networks = state.networks.lock().unwrap();

    sys.refresh_cpu_usage();
    sys.refresh_memory();
    networks.refresh();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cpu_cores = sys.cpus().len();

    let ram_used = sys.used_memory();
    let ram_total = sys.total_memory();
    let swap_used = sys.used_swap();
    let swap_total = sys.total_swap();

    let mut net_rx = 0;
    let mut net_tx = 0;
    for (_, data) in networks.iter() {
        net_rx += data.received();
        net_tx += data.transmitted();
    }

    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let kernel = System::kernel_version().unwrap_or_else(|| "Unknown".to_string());
    let uptime = System::uptime();

    SystemInfo {
        cpu_usage,
        cpu_cores,
        ram_used,
        ram_total,
        swap_used,
        swap_total,
        net_rx,
        net_tx,
        os_name,
        kernel,
        uptime,
    }
}
