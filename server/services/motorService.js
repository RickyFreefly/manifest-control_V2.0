// backend/services/motorService.js
import ModbusRTU from "modbus-serial";
import { Server } from "socket.io";

const EngineIp = "127.0.0.1";  // Cambia a "192.168.1.254" si usas la IP real
const EnginePort = 502;        // O 369 según tu setup
const client = new ModbusRTU();

let ioInstance = null;

// ============================
// 🔹 Inicialización del servicio
// ============================
export function initMotorService(httpServer) {
  ioInstance = new Server(httpServer, { cors: { origin: "*" } });
  connectToMotor();
}

// ============================
// 🔹 Conexión y lectura
// ============================
function connectToMotor() {
  client
    .connectTCP(EngineIp, { port: EnginePort })
    .then(() => {
      client.setID(1);
      console.log("✅ Conectado al motor Modbus");
      startReadingLoop();
    })
    .catch((err) => {
      console.error("❌ Error al conectar al motor:", err.message);
      setTimeout(connectToMotor, 3000);
    });
}

async function startReadingLoop() {
  while (true) {
    try {
      const rpmRaw = await client.readHoldingRegisters(100, 1);
      const torqueRaw = await client.readHoldingRegisters(120, 1);

      const rpm = Math.round(rpmRaw.data[0] / 3.34);
      const torque = Math.round(torqueRaw.data[0] / 1.3);

      const minRpm = 400,
        maxRpm = 1350,
        minPct = 5;
      const slope = (100 - minPct) / (maxRpm - minRpm);
      const percent = slope * (rpm - minRpm) + minPct;

      ioInstance.emit("motorData", {
        rpm,
        torque,
        percent: Math.min(Math.max(percent, 0), 100),
      });

      await delay(1000); // cada 1s
    } catch (err) {
      console.error("⚠️ Error en lectura Modbus:", err.message);
      await delay(3000);
      connectToMotor();
      break;
    }
  }
}

// ============================
// 🔹 NUEVA FUNCIÓN: Enviar velocidad
// ============================
export async function setMotorSpeed(porcentaje) {
  try {
    // Validar rango
    const pct = Math.min(Math.max(porcentaje, 4), 100);

    // --- Mapear porcentaje → registro Modbus (basado en tu C#) ---
    const rangeStart = 4;
    const rangeEnd = 100;

    const registerToSendStart = 3510;
    const registerToSendEnd = 12150;

    // Cálculo lineal proporcional
    const factor =
      (registerToSendEnd - registerToSendStart) / (rangeEnd - rangeStart);

    const registerToSend = Math.round(
      registerToSendStart + (pct - rangeStart) * factor
    );

    console.log(`⚙️ Enviando velocidad: ${pct}% → Registro ${registerToSend}`);

    // --- Enviar al motor ---
    await client.writeRegister(100, registerToSend);

    // Emitir actualización al frontend
    if (ioInstance) {
      ioInstance.emit("motorCommand", { porcentaje: pct, registerToSend });
    }

    return { ok: true, porcentaje: pct, registerToSend };
  } catch (err) {
    console.error("❌ Error al escribir velocidad:", err.message);
    return { ok: false, error: err.message };
  }
}

// ============================
// 🔹 Utilidad: delay
// ============================
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
