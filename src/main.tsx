import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Configurar UTMify pixel
(window as any).pixelId = "69079f6b42e3b6a198dc0b4d";

// Script do pixel
const pixelScript = document.createElement("script");
pixelScript.src = "https://cdn.utmify.com.br/scripts/pixel/pixel.js";
pixelScript.async = true;
pixelScript.defer = true;
document.head.appendChild(pixelScript);

// Script principal (captura UTMs + identifica visitor_id)
const mainScript = document.createElement("script");
mainScript.src = "https://cdn.utmify.com.br/scripts/utms/latest.js";
mainScript.async = true;
mainScript.defer = true;
mainScript.setAttribute("data-utmify-prevent-xcod-sck", "");
mainScript.setAttribute("data-utmify-prevent-subids", "");
document.body.appendChild(mainScript);

createRoot(document.getElementById("root")!).render(<App />);
