import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installRangeCacheBuster } from "./network";
import "./styles.css";

globalThis.Buffer = Buffer;
installRangeCacheBuster();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
