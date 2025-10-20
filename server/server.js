// backend/server.js
import express from "express";
import http from "http";
import cors from "cors";
import { initMotorService } from "./services/motorService.js";
import motorRouter from "./routes/motor.js";

const app = express();
const server = http.createServer(app);

// === Middlewares ===
app.use(cors());
app.use(express.json());

// === Rutas ===
app.use("/motor", motorRouter);

// === Inicializa el servicio Modbus + Socket.IO ===
initMotorService(server);

// === Servidor HTTP ===
server.listen(3000, () => console.log("🚀 Servidor en puerto 3000"));
