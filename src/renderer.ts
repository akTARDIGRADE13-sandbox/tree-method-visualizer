import type { Cell, Rect } from "./tree";
import { clamp } from "./utils";

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

  for (let j = 0; j < m; j++) {
    for (let i = 0; i < m; i++) {
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

export function drawScene(
  canvas: HTMLCanvasElement,
  particles: Particle[],
  cells: Cell[],
  targetParticleIndex: number,
): void {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get 2D canvas context.");
  }

  const width = canvas.width;
  const height = canvas.height;

  clearCanvas(context, width, height);

  for (const cell of cells) {
    drawCell(context, cell, width, height);
  }

  for (const particle of particles) {
    const isTarget = particle.id === targetParticleIndex;
    drawParticle(context, particle, width, height, isTarget);
  }
}

function clearCanvas(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.clearRect(0, 0, width, height);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
}

function drawCell(
  context: CanvasRenderingContext2D,
  cell: Cell,
  width: number,
  height: number,
): void {
  const rect = toCanvasRect(cell.bounds, width, height);

  context.strokeStyle = getCellStrokeStyle(cell.depth);
  context.lineWidth = cell.depth === 0 ? 2 : 1;

  context.strokeRect(rect.x, rect.y, rect.width, rect.height);

  if (cell.isLeaf) {
    context.fillStyle = "rgba(59, 130, 246, 0.04)";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: Particle,
  width: number,
  height: number,
  isTarget: boolean,
): void {
  const { x, y } = toCanvasPosition(particle.position, width, height);

  context.beginPath();
  context.arc(x, y, isTarget ? 4 : 1.5, 0, Math.PI * 2);
  context.fillStyle = isTarget ? "#dc2626" : "#111111";
  context.fill();

  if (isTarget) {
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();
  }
}

function toCanvasRect(
  bounds: Rect,
  width: number,
  height: number,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const topLeft = toCanvasPosition(
    {
      x: bounds.xMin,
      y: bounds.yMax,
    },
    width,
    height,
  );

  const bottomRight = toCanvasPosition(
    {
      x: bounds.xMax,
      y: bounds.yMin,
    },
    width,
    height,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

function toCanvasPosition(position: Vec2, width: number, height: number): Vec2 {
  const margin = 40;
  const size = Math.min(width, height) - margin * 2;

  return {
    x: margin + position.x * size,
    y: margin + (1.0 - position.y) * size,
  };
}

function getCellStrokeStyle(depth: number): string {
  if (depth === 0) {
    return "#111827";
  }

  if (depth <= 2) {
    return "#6b7280";
  }

  if (depth <= 4) {
    return "#9ca3af";
  }

  return "#d1d5db";
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
