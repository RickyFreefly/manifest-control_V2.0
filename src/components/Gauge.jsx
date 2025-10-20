import React, { useEffect, useRef } from "react";

export default function Gauge({ value = 0, label = "RPM" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = 300;
    const center = size / 2;
    const radius = 120;

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // === DIBUJAR ESCALA ===
    ctx.save();
    ctx.translate(center, center);
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI * 0.75, Math.PI * 0.25, false);
    ctx.stroke();

    for (let i = 0; i <= 100; i += 5) {
      const angle = Math.PI * (0.75 + (i / 100) * 1.5);
      const x1 = Math.cos(angle) * (radius - 10);
      const y1 = Math.sin(angle) * (radius - 10);
      const x2 = Math.cos(angle) * radius;
      const y2 = Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (i % 10 === 0) {
        const tx = Math.cos(angle) * (radius - 25);
        const ty = Math.sin(angle) * (radius - 25);
        ctx.fillStyle = "#00BFFF";
        ctx.font = "bold 14px Orbitron";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.toString(), tx, ty);
      }
    }
    ctx.restore();

// === AGUJA CORRECTA DEFINITIVA ===
// 🧭 El arco está dibujado de 135° (izquierda) a 45° (derecha) en sentido horario.
// Por lo tanto, la aguja debe calcularse en el mismo sentido.

const startAngle = Math.PI * -0.75; // izquierda (0%)
const endAngle = Math.PI * 0.75;   // derecha (100%)
const needleAngle = startAngle + (value / 100) * (endAngle - startAngle);

ctx.save();
ctx.translate(center, center);
ctx.rotate(needleAngle);

// sombra
ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
ctx.shadowBlur = 6;

// aguja triangular
ctx.beginPath();
ctx.moveTo(-5, 10);
ctx.lineTo(5, 10);
ctx.lineTo(0, -radius + 15);
ctx.closePath();

const gradient = ctx.createLinearGradient(0, 0, 0, -radius);
gradient.addColorStop(0, "#FF6666");
gradient.addColorStop(1, "#CC0000");
ctx.fillStyle = gradient;
ctx.fill();

ctx.lineWidth = 1;
ctx.strokeStyle = "#990000";
ctx.stroke();

ctx.restore();

// === CENTRO MEJORADO ===
ctx.beginPath();
ctx.arc(center, center, 8, 0, 2 * Math.PI);
const centerGradient = ctx.createRadialGradient(center, center, 2, center, center, 8);
centerGradient.addColorStop(0, "#ff9999");
centerGradient.addColorStop(0.6, "#ff3333");
centerGradient.addColorStop(1, "#660000");
ctx.fillStyle = centerGradient;
ctx.fill();


    // === VALOR NUMÉRICO ===
    ctx.fillStyle = "#007FFF";
    ctx.font = "700 28px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(value)}`, center, center + 70);

    // === ETIQUETA ===
    ctx.fillStyle = "#FF3333";
    ctx.font = "700 20px Orbitron";
    ctx.fillText(label, center, center + 100);
  }, [value, label]);

  return (
    <div
      style={{
        textAlign: "center",
        margin: "0 auto",
        paddingTop: "1rem",
      }}
    >
      <canvas ref={canvasRef} width={300} height={300} />
    </div>
  );
}
