import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./context/SettingsContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<SettingsProvider>
		<App />
	</SettingsProvider>
);
