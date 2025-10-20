import { useState, useEffect } from "react";
import Gauge from "./Gauge";
import socket from "../services/socketService";
import "./ControlPanel.css";

export default function ControlPanel() {
  const [rpm, setRpm] = useState(0);
  const [power, setPower] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [setNum, setSetNum] = useState(0);
  const [flyer, setFlyer] = useState("SE PREPARA");

  // 🔹 Emitir actualizaciones al display
  const updateDisplay = (data = {}) => {
    socket.emit("updateDisplay", {
      setNum,
      flyer,
      power,
      speed: rpm * 2, // Ejemplo simple de conversión
      time: "00:00",
      ...data,
    });
  };

  // 🔹 Manejo de botones
  const handleStart = () => {
    setIsRunning(true);
    setFlyer("EN VUELO");
    updateDisplay({ flyer: "EN VUELO" });
  };

  const handleStop = () => {
    setIsRunning(false);
    setFlyer("SE PREPARA");
    setRpm(0);
    updateDisplay({ flyer: "SE PREPARA", speed: 0 });
  };

  const increasePower = () => {
    setPower((p) => Math.min(p + 5, 100));
    setRpm((r) => Math.min(r + 5, 100));
    updateDisplay();
  };

  const decreasePower = () => {
    setPower((p) => Math.max(p - 5, 0));
    setRpm((r) => Math.max(r - 5, 0));
    updateDisplay();
  };

  useEffect(() => {
    updateDisplay();
  }, [rpm, power]);

  return (
    <div className="control-container">
      <div className="top-bar">
        <div className={`indicator ${isRunning ? "green" : "red"}`}></div>
        <img src="/logo.png" alt="Gravity" className="logo" />
      </div>

      <div className="gauge-section">
        <Gauge value={rpm} label="RPM" />
      </div>

      <div className="readout">
        <div className="digit-blue">{rpm}</div>
        <div className="digit-red">{power}%</div>
      </div>

      <div className="buttons">
        <button className="btn-control" onClick={decreasePower}>▼</button>
        <button
          className={`btn-main ${isRunning ? "stop" : "start"}`}
          onClick={isRunning ? handleStop : handleStart}
        >
          {isRunning ? "STOP SET" : "START SET"}
        </button>
        <button className="btn-control" onClick={increasePower}>▲</button>
      </div>
    </div>
  );
}
