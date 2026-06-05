import { Router, Route } from "@solidjs/router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./screens/Dashboard";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { WorkspacesScreen } from "./screens/WorkspacesScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { DevToolsScreen } from "./screens/DevToolsScreen";
import { SystemDashboard } from "./screens/SystemDashboard";
import { SettingsScreen } from "./screens/SettingsScreen";

function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={Dashboard} />
      <Route path="/calculator" component={CalculatorScreen} />
      <Route path="/history" component={HistoryScreen} />
      <Route path="/workspaces" component={WorkspacesScreen} />
      <Route path="/converter" component={ConverterScreen} />
      <Route path="/devtools" component={DevToolsScreen} />
      <Route path="/system" component={SystemDashboard} />
      <Route path="/settings" component={SettingsScreen} />
    </Router>
  );
}

export default App;
