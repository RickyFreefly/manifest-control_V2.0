import { useState, useEffect } from "react";
import "./DisplayPanel.css";
import socket from "../services/socketService";

export default function DisplayPanel() {
  const [flyer, setFlyer] = useState("SE PREPARA");
  const [prepara, setPrepara] = useState("");
  const [setNum, setSetNum] = useState("");
  const [time, setTime] = useState("00:00");
  const [power, setPower] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [flash, setFlash] = useState(false);

  // === Función común para aplicar datos ===
  const applyDisplayData = (data) => {
    if (data.flyer !== undefined) setFlyer(data.flyer);
    if (data.prepara !== undefined) setPrepara(data.prepara);
    if (data.setNum !== undefined) setSetNum(data.setNum);
    if (data.time !== undefined) setTime(data.time);
    if (data.power !== undefined) setPower(data.power);
    if (data.speed !== undefined) setSpeed(data.speed);
    if (data.flash) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
  };

  useEffect(() => {
    // 🔌 Escucha por SOCKET (desde backend Modbus)
    socket.on("updateDisplay", applyDisplayData);

    // 📡 Escucha por BROADCAST CHANNEL (entre pestañas)
    const channel = new BroadcastChannel("gravity-display");
    channel.onmessage = (event) => {
      console.log("📥 Recibido por BroadcastChannel:", event.data);
      applyDisplayData(event.data);
    };

    return () => {
      socket.off("updateDisplay", applyDisplayData);
      channel.close();
    };
  }, []);

  return (
    <div className={`display-white-container ${flash ? "flash-active" : ""}`}>
      {/* 🔹 HEADER */}
      <div className="header">
        <div className="flyer-group">
          <h1 className="label-blue">FLYER</h1>
          <div className="flyer-name">{flyer}</div>
        </div>

        <div className="flyer-group">
          <h1 className="label-blue">SE PREPARA</h1>
          <div className="flyer-next">{prepara || "—"}</div>
        </div>
      </div>

      {/* 🌬 VISUALIZACIÓN CENTRAL DEL FLUJO DE VIENTO */}
      <div className="wind-visual">
        <div
          className="wind-visual-fill"
          style={{
            clipPath: `inset(0 ${100 - power}% 0 0 round 28px)`,
          }}
        ></div>
        <div className="wind-lines"></div>
      </div>

      {/* 🔸 MÉTRICAS */}
      <div className="metrics">
        <div className="metric">
          <h2 className="metric-label">SET</h2>
          <div className="digit-blue">{setNum || "0/0"}</div>
        </div>

        <div className="metric main-time">
          <h2 className="metric-label">TIME</h2>
          <div className="digit-blue large">{time}</div>
        </div>

        <div className="metric">
          <h2 className="metric-label">POWER</h2>
          <div className="digit-red">{power}%</div>
        </div>
      </div>

      {/* 🔻 FOOTER */}
      <div className="footer">
        <div className="wind-section">
          <h3 className="metric-label red">WIND SPEED</h3>
          <div className="wind-bar-container">
            <div
              className="wind-bar-fill"
              style={{ width: `${power}%` }}
            ></div>
          </div>
          <div className="digit-red wind">{speed} km/h</div>
        </div>

        <div className="brand-section">
          <img src="/logo.png" alt="Gravity" className="logo" />
        </div>
      </div>
    </div>
  );
}
