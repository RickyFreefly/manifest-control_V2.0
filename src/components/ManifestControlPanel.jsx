import { useState, useEffect } from "react";
import socket from "../services/socketService";
import "./ManifestControlPanel.css";

export default function ManifestControlPanel() {
  const [sets, setSets] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      time: "01:00",
      active: false,
    }))
  );
  const [power, setPower] = useState(5);
  const [speed, setSpeed] = useState(400);
  const [running, setRunning] = useState(false);
  const [currentSet, setCurrentSet] = useState(0);
  const [timer, setTimer] = useState("00:00");

  // 🔹 Enviar datos al display
  const updateDisplay = (extra = {}) => {
    socket.emit("updateDisplay", {
      setNum: currentSet,
      power,
      speed,
      time: timer,
      flyer: running ? "EN VUELO" : "SE PREPARA",
      ...extra,
    });
  };

  // 🔹 Control de sets
  const toggleSet = (id) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s
      )
    );
  };

  const removeSet = (id) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  // 🔹 Control de potencia
  const increasePower = () => {
    setPower((p) => Math.min(p + 5, 100));
    setSpeed((s) => Math.min(s + 50, 1000));
    updateDisplay();
  };

  const decreasePower = () => {
    setPower((p) => Math.max(p - 5, 0));
    setSpeed((s) => Math.max(s - 50, 0));
    updateDisplay();
  };

  // 🔹 Inicio / pausa
  const startSet = () => {
    setRunning(true);
    setCurrentSet((c) => c + 1);
    updateDisplay({ flyer: "EN VUELO" });
  };

  const pauseSet = () => {
    setRunning(false);
    updateDisplay({ flyer: "PAUSA" });
  };

  const resetAll = () => {
    setRunning(false);
    setCurrentSet(0);
    setTimer("00:00");
    updateDisplay({ flyer: "SE PREPARA", setNum: 0 });
  };

  useEffect(() => {
    updateDisplay();
  }, [power, speed, currentSet, running]);

  return (
    <div className="manifest-container">
      <h1>Manifest Control</h1>

      <div className="set-list">
        {sets.map((s) => (
          <div
            key={s.id}
            className={`set-row ${s.active ? "active" : ""}`}
          >
            <span>{s.id}</span>
            <input
              type="time"
              value={s.time}
              onChange={(e) =>
                setSets((prev) =>
                  prev.map((x) =>
                    x.id === s.id ? { ...x, time: e.target.value } : x
                  )
                )
              }
            />
            <button onClick={() => toggleSet(s.id)}>
              {s.active ? "ON" : "SWITCH"}
            </button>
            <button className="danger" onClick={() => removeSet(s.id)}>
              ✖
            </button>
            <button onClick={() => startSet()}>SET</button>
          </div>
        ))}
      </div>

      <div className="controls">
        <select value={power} onChange={(e) => setPower(Number(e.target.value))}>
          {[5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>

        <div className="speed-display">{speed}</div>

        <div className="power-buttons">
          <button onClick={increasePower}>▲</button>
          <button onClick={decreasePower}>▼</button>
        </div>

        <div className="main-controls">
          <button
            onClick={running ? pauseSet : startSet}
            className={`main-btn ${running ? "pause" : "start"}`}
          >
            {running ? "⏸ PAUSE" : "▶ START SET"}
          </button>
          <button className="reset" onClick={resetAll}>
            ⏹ RESET
          </button>
        </div>

        <div className="timer">{timer}</div>
      </div>
    </div>
  );
}
