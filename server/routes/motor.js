// backend/routes/motor.js
import express from "express";
import { setMotorSpeed } from "../services/motorService.js";

const router = express.Router();

// POST /motor/velocidad
router.post("/velocidad", async (req, res) => {
  const { power } = req.body;
  const result = await setMotorSpeed(Number(power));
  res.json(result);
});

export default router;
