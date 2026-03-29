import { useState } from "react";

export default function TiltCard({ children, className = "" }) {
  const [transform, setTransform] = useState("perspective(1200px) rotateX(0deg) rotateY(0deg)");

  function handleMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const rotateX = ((y / bounds.height) - 0.5) * -8;
    const rotateY = ((x / bounds.width) - 0.5) * 8;

    setTransform(`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  }

  function resetTilt() {
    setTransform("perspective(1200px) rotateX(0deg) rotateY(0deg)");
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      className={className}
      style={{
        transform,
        transformStyle: "preserve-3d",
        transition: "transform 180ms ease"
      }}
    >
      {children}
    </div>
  );
}
