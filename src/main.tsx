import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";

const theme = localStorage.getItem("theme");

if (theme === "light") {
  document.documentElement.classList.add("light");
} else {
  document.documentElement.classList.remove("light");
}

const isIos =
  /iPhone|iPad|iPod/.test(window.navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

if (isIos && isStandalone) {
  document.documentElement.classList.add("ios-standalone");
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);