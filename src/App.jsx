import React from "react";
import DisplayPanel from "./components/DisplayPanel";
import ControlPanel from "./components/ControlPanel";
import ManifestControlPanel from "./components/ManifestControlPanel"; // 🔹 nuevo import
import ControlManifestPanel from "./components/ControlManifestPanel";
import "./App.css";

export default function App() {
  const [view, setView] = React.useState("display"); // alterna entre vistas

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    background: "#00b0ff",
    color: "#fff",
    transition: "all 0.2s",
  };

  const activeStyle = {
    background: "#0288d1",
    transform: "scale(1.05)",
  };

  return (
    <div>
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          margin: "20px 0",
        }}
      >
        <button
          onClick={() => setView("display")}
          style={{ ...buttonStyle, ...(view === "display" ? activeStyle : {}) }}
        >
          🖥 Display
        </button>

        <button
          onClick={() => setView("control")}
          style={{ ...buttonStyle, ...(view === "control" ? activeStyle : {}) }}
        >
          🎛 Control
        </button>

        <button 
          onClick={() => setView("controlmanifest")}
          >⚙️ Control+Manifest</button>

        <button
          onClick={() => setView("manifest")}
          style={{ ...buttonStyle, ...(view === "manifest" ? activeStyle : {}) }}
        >
          📋 Manifest
        </button>
      </nav>

      {view === "display" && <DisplayPanel />}
      {view === "control" && <ControlPanel />}
      {view === "manifest" && <ManifestControlPanel />}
      {view === "controlmanifest" && <ControlManifestPanel />}
    </div>
  );
}
