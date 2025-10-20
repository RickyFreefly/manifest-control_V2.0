// src/services/motorApi.js
const API_URL = "http://localhost:3000/motor";

export async function setMotorSpeed(power) {
  try {
    const res = await fetch(`${API_URL}/velocidad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ power }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ Error enviando velocidad al motor:", err);
  }
}
