import { useState, useEffect, useRef } from "react";
import Gauge from "./Gauge";
import socket from "../services/socketService";
import { setMotorSpeed } from "../services/motorApi"; // ✅ Nuevo servicio
import "./ControlManifestPanel.css";

// 🔹 Canal de comunicación entre pestañas
const channel = new BroadcastChannel("gravity-display");

export default function ControlManifestPanel() {
  const [rpm, setRpm] = useState(0);
  const [power, setPower] = useState(5);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const beep = useRef(new Audio("/sounds/beep.mp3"));
  const timersRef = useRef({});
  const debounceRef = useRef(null); // ✅ para evitar spam de teclas

  const [flyers, setFlyers] = useState([
    {
      id: 1,
      name: "Test",
      seconds: 60,
      initial: 60,
      active: false,
      status: "idle",
      sets: 3,
      totalSets: 3,
      currentSet: 1,
    },
  ]);

  const timeOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 30);

  const formatTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const triggerFlash = () => {
    setFlash(true);
    beep.current.play().catch(() => {});
    setTimeout(() => setFlash(false), 800);
  };

  // ======== ACTUALIZA DISPLAY (socket + BroadcastChannel) ========
  const updateDisplay = (extra = {}) => {
    const activeIndex = flyers.findIndex((f) => f.active);
    const activeFlyer = flyers[activeIndex];
    const nextFlyer = activeIndex >= 0 ? flyers[activeIndex + 1] : null;

    const data = {
      flyer: activeFlyer?.name || "SE PREPARA",
      prepara: nextFlyer?.name || "",
      setNum: activeFlyer
        ? `${activeFlyer.currentSet}/${activeFlyer.totalSets}`
        : "",
      power,
      speed: rpm * 2,
      time: activeFlyer ? formatTime(activeFlyer.seconds) : "00:00",
      flash,
      ...extra,
    };

    socket.emit("updateDisplay", data);
    channel.postMessage(data);
  };

  // ======================================================
  // 🔌 LECTURA DE PARÁMETROS DEL MOTOR (desde backend Modbus)
  // ======================================================
  const flyersRef = useRef(flyers);
  const flashRef = useRef(flash);

  useEffect(() => {
    flyersRef.current = flyers;
    flashRef.current = flash;
  }, [flyers, flash]);

  useEffect(() => {
    const handleMotorData = (data) => {
      const rpmValue = Math.round(data.rpm);
      const powerValue = Math.round(data.percent);
      setRpm(rpmValue);
      setPower(powerValue);

      const currentFlyers = flyersRef.current;
      const activeIndex = currentFlyers.findIndex((f) => f.active);
      const activeFlyer = currentFlyers[activeIndex];
      const nextFlyer = activeIndex >= 0 ? currentFlyers[activeIndex + 1] : null;

      const displayData = {
        flyer: activeFlyer?.name || "SE PREPARA",
        prepara: nextFlyer?.name || "",
        setNum: activeFlyer
          ? `${activeFlyer.currentSet}/${activeFlyer.totalSets}`
          : "",
        power: powerValue,
        speed: rpmValue * 2,
        time: activeFlyer ? formatTime(activeFlyer.seconds) : "00:00",
        flash: flashRef.current,
      };

      socket.emit("updateDisplay", displayData);
      channel.postMessage(displayData);
    };

    socket.on("motorData", handleMotorData);
    return () => socket.off("motorData", handleMotorData);
  }, []);

useEffect(() => {
  const handleKeyDown = (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault(); // ❌ evita moverse entre campos o scroll
      setPower((prev) => {
        let newPower = prev;
        if (event.key === "ArrowUp") newPower = Math.min(prev + 5, 100);
        if (event.key === "ArrowDown") newPower = Math.max(prev - 5, 0);
        socket.emit("updatePower", newPower);
        return newPower;
      });
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);

  // ======== GESTIÓN DE FLYERS ========
  const addFlyer = () => {
    setFlyers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        seconds: 60,
        initial: 60,
        active: false,
        status: "idle",
        sets: 1,
        totalSets: 1,
        currentSet: 1,
      },
    ]);
  };

  const removeFlyer = (id) => {
    clearInterval(timersRef.current[id]);
    delete timersRef.current[id];
    setFlyers((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFlyer = (id, field, value) => {
    setFlyers((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (field === "sets") {
          return {
            ...f,
            sets: Number(value),
            totalSets: Number(value),
            currentSet: 1,
          };
        }
        return { ...f, [field]: value };
      })
    );
  };

  const moveFlyer = (index, direction) => {
    const newList = [...flyers];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    setFlyers(newList);
  };

  // ======== AJUSTE EN VIVO ========
  const adjustActiveTime = (id, delta) => {
    setFlyers((prev) =>
      prev.map((f) => {
        if (f.id === id && f.active) {
          const newSeconds = Math.max(0, f.seconds + delta);
          updateDisplay({ time: formatTime(newSeconds) });

          if (newSeconds === 0) {
            clearInterval(timersRef.current[id]);
            delete timersRef.current[id];
            triggerFlash();
            handleSetEnd(id);
            return { ...f, seconds: 0, active: false, status: "done" };
          }
          return { ...f, seconds: newSeconds };
        }
        return f;
      })
    );
  };

  // ======== GESTIÓN DE SETS ========
  const handleSetEnd = (id) => {
    if (handleSetEnd.locked?.[id]) return;
    handleSetEnd.locked = handleSetEnd.locked || {};
    handleSetEnd.locked[id] = true;
    setTimeout(() => delete handleSetEnd.locked[id], 500);

    setFlyers((prev) =>
      prev.flatMap((f) => {
        if (f.id === id) {
          const remaining = f.sets - 1;
          const nextSet = f.currentSet + 1;

          if (remaining <= 0) {
            updateDisplay({ flyer: "SE PREPARA", setNum: "" });
            return [];
          }

          return [
            {
              ...f,
              sets: remaining,
              currentSet: nextSet,
              seconds: f.initial,
              active: false,
              status: "idle",
            },
          ];
        }
        return [f];
      })
    );
  };

  // ======== CONTROL DEL CONTADOR ========
  const startFlyer = (id) => {
    clearInterval(timersRef.current[id]);
    delete timersRef.current[id];
    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      setFlyers((current) =>
        current.map((x) => {
          if (x.id !== id || !x.active) return x;
          if (x.seconds <= 1) {
            clearInterval(timersRef.current[id]);
            delete timersRef.current[id];
            triggerFlash();
            handleSetEnd(id);
            return { ...x, seconds: 0, active: false, status: "done" };
          }
          const newSeconds = x.seconds - 1;
          const currentIndex = current.findIndex((f) => f.id === id);
          const nextFlyer = current[currentIndex + 1];
          updateDisplay({
            flyer: x.name,
            prepara: nextFlyer?.name || "",
            time: formatTime(newSeconds),
            setNum: `${x.currentSet}/${x.totalSets}`,
          });
          return { ...x, seconds: newSeconds };
        })
      );
    };

    const timerId = setInterval(tick, 1000);
    timersRef.current[id] = timerId;

    setFlyers((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, active: true, status: "active" }
          : { ...f, active: false }
      )
    );

    const currentIndex = flyers.findIndex((f) => f.id === id);
    const nextFlyer = flyers[currentIndex + 1];
    const flyer = flyers[currentIndex];
    updateDisplay({
      flyer: flyer?.name || "SE PREPARA",
      prepara: nextFlyer?.name || "",
      flyerState: "EN VUELO",
    });

    return () => {
      mounted = false;
      clearInterval(timerId);
      delete timersRef.current[id];
    };
  };

  const pauseFlyer = (id) => {
    clearInterval(timersRef.current[id]);
    delete timersRef.current[id];
    setFlyers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: false, status: "idle" } : f))
    );
    updateDisplay({ flyerState: "PAUSA" });
  };

  const resetFlyer = (id) => {
    clearInterval(timersRef.current[id]);
    delete timersRef.current[id];
    setFlyers((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              seconds: f.initial,
              active: false,
              status: "idle",
              sets: f.totalSets,
              currentSet: 1,
            }
          : f
      )
    );
  };

  const changeFlyerTime = (id, newSeconds) => {
    setFlyers((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, seconds: newSeconds, initial: newSeconds } : f
      )
    );
  };

  // ======== POTENCIA MANUAL (enviando al backend) ========
  const changePower = (delta) => {
    clearTimeout(debounceRef.current);
    setPower((prev) => {
      const newPower = Math.min(100, Math.max(4, prev + delta));
      debounceRef.current = setTimeout(() => setMotorSpeed(newPower), 150); // ✅ envía al backend
      return newPower;
    });
    setRpm((r) => Math.min(Math.max(r + delta * 50, 0), 1350));
  };

  const increasePower = () => changePower(1);
  const decreasePower = () => changePower(-1);

  // ======== TECLAS DE FLECHA ARRIBA / ABAJO ========
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") increasePower();
      else if (e.key === "ArrowDown") decreasePower();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ======== ACTUALIZA DISPLAY AUTOMÁTICAMENTE ========
  useEffect(() => {
    updateDisplay();
  }, [rpm, power, flyers, flash]);

  useEffect(() => {
    return () => Object.values(timersRef.current).forEach(clearInterval);
  }, []);

  // ======== UI ========
  return (
    <div className={`control-manifest-container ${flash ? "flash-active" : ""}`}>
      <div className="control-section">
        <div className="top-bar">
          <div className={`indicator ${running ? "green" : "red"}`}></div>
          <img src="/logo.png" alt="Gravity" className="logo" />
        </div>

        <Gauge value={power} label={`RPM: ${rpm}`} />

        <div className="readout">
          <div className="digit-blue">{rpm}</div>
          <div className="digit-red">{power}%</div>
        </div>

        <div className="buttons">
          <button onClick={decreasePower}>▼</button>
          <button
            className="btn-main start"
            onClick={() => setRunning(!running)}
          >
            {running ? "⏹ STOP" : "▶ POWER ON"}
          </button>
          <button onClick={increasePower}>▲</button>
        </div>
      </div>

      {/* ===================== */}
      {/*   MANIFEST SECTION    */}
      {/* ===================== */}
      <div className="manifest-section">
        <h2>Manifest</h2>
        <button className="add-flyer" onClick={addFlyer}>
          ➕ Agregar Flyer
        </button>

        <div className="flyer-list">
          {flyers.map((f, index) => (
            <div
              key={f.id}
              className={`flyer-row ${f.active ? "active-flyer" : ""}`}
            >
              <div className="flyer-top">
                <span className="flyer-index">{index + 1}</span>
                <input
                  type="text"
                  value={f.name}
                  placeholder="Nombre del flyer"
                  onChange={(e) => updateFlyer(f.id, "name", e.target.value)}
                  className="flyer-name"
                />

                <div className="action-buttons-inline">
                  {f.active ? (
                    <button
                      className="pause-btn"
                      onClick={() => pauseFlyer(f.id)}
                    >
                      ⏸
                    </button>
                  ) : (
                    <button
                      className="start-btn"
                      onClick={() => startFlyer(f.id)}
                    >
                      ▶
                    </button>
                  )}
                  <button
                    className="reset-btn"
                    onClick={() => resetFlyer(f.id)}
                  >
                    🔁
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => removeFlyer(f.id)}
                  >
                    ✖
                  </button>
                </div>

                <div className="move-buttons">
                  <button onClick={() => moveFlyer(index, "up")}>⬆️</button>
                  <button onClick={() => moveFlyer(index, "down")}>⬇️</button>
                </div>

                <div className="fine-adjust">
                  <button
                    disabled={!f.active}
                    onClick={() => adjustActiveTime(f.id, -5)}
                  >
                    −5s
                  </button>
                  <button
                    disabled={!f.active}
                    onClick={() => adjustActiveTime(f.id, +5)}
                  >
                    +5s
                  </button>
                </div>
              </div>

              <div className="flyer-bottom">
                <div className="details">
                  <label>⏱</label>
                  <select
                    className="time-select"
                    value={f.initial}
                    onChange={(e) =>
                      changeFlyerTime(f.id, Number(e.target.value))
                    }
                  >
                    {timeOptions.map((sec) => (
                      <option key={sec} value={sec}>
                        {formatTime(sec)}
                      </option>
                    ))}
                  </select>

                  <label>SET</label>
                  <input
                    type="number"
                    min="1"
                    value={f.sets}
                    onChange={(e) =>
                      updateFlyer(
                        f.id,
                        "sets",
                        Math.max(1, Number(e.target.value))
                      )
                    }
                    className="set-input"
                  />

                  <label>TIME</label>
                  <span className="countdown-display">
                    {formatTime(f.seconds)}
                  </span>

                  <label>PROG</label>
                  <span className="set-progress">
                    {f.currentSet}/{f.totalSets}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
