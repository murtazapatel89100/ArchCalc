import { Route, Router } from "@solidjs/router";
import { Layout } from "./components/Layout";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { Dashboard } from "./screens/Dashboard";
import { DevToolsScreen } from "./screens/DevToolsScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SystemDashboard } from "./screens/SystemDashboard";
import { WorkspacesScreen } from "./screens/WorkspacesScreen";

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
