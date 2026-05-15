export type Vec2 = {
  x: number;
  y: number;
};

export type Particle = {
  id: number;
  position: Vec2;
};

export function generateParticles(n: number, seed: number): Particle[] {
  const m = Math.sqrt(n);

  if (!Number.isInteger(m)) {
    throw new Error(`N must be a perfect square: ${n}`);
  }

  const h = 1.0 / m;
  const particles: Particle[] = [];

  const random = createRandom(seed);

  for (let j = 0; j < m; ++j) {
    for (let i = 0; i < m; ++i) {
      const baseX = (i + 0.5) / m;
      const baseY = (j + 0.5) / m;
      const dx = (random() - 0.5) * h;
      const dy = (random() - 0.5) * h;

      const x = clamp(baseX + dx, 0.001, 0.999);
      const y = clamp(baseY + dy, 0.001, 0.999);

      particles.push({
        id: particles.length,
        position: { x, y },
      });
    }
  }

  return particles;
}

export function drawParticles(
  canvas: HTMLCanvasElement,
  particles: Particle[],
  openingAngle: number,
): void {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get 2D canvas context.");
  }

  const width = canvas.width;
  const height = canvas.height;

  clearCanvas(context, width, height);
  drawUnitSquare(context, width, height);

  for (const particle of particles) {
    drawParticle(context, particle, width, height);
  }
}

function clearCanvas(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.clearRect(0, 0, width, height);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
}

function drawUnitSquare(context: CanvasRenderingContext2D, width: number, height: number): void {
  const margin = 40;
  const size = Math.min(width, height) - margin * 2;

  context.strokeStyle = "#333333";
  context.lineWidth = 2;
  context.strokeRect(margin, margin, size, size);
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: Particle,
  width: number,
  height: number,
): void {
  const { x, y } = toCanvasPosition(particle.position, width, height);

  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2);
  context.fillStyle = "#111111";
  context.fill();
}

function toCanvasPosition(position: Vec2, width: number, height: number): Vec2 {
  const margin = 40;
  const size = Math.min(width, height) - margin * 2;

  return {
    x: margin + position.x * size,
    y: margin + (1.0 - position.y) * size,
  };
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
