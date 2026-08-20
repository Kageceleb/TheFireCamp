import React from "react";
import ReactDOM from "react-dom/client";
// Side-effect import — registers window.handleSymbioteStateChange and
// window.handleRollResult as real globals before anything else runs,
// so they exist as early as possible for TaleSpire's API injection to
// call them. These exact names must match symbiote/manifest.json's
// api.subscriptions — see src/lib/symbiote/client.ts.
import "./lib/symbiote/client";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("index.html is missing the #root element the app mounts into.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
