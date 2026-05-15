import type { BuildStep, Cell, Rect } from "./tree";
import { clamp } from "./utils";

export type Vec2 = {
  x: number;
  y: number;
};

export type Particle = {
  id: number;
  position: Vec2;
};

export type BuildRenderState = {
  visibleCellIds: Set<number>;
  currentCellId: number | null;
  createdChildCellIds: Set<number>;
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

export function createBuildRenderState(
  buildSteps: BuildStep[],
  currentStepIndex: number,
): BuildRenderState {
  const visibleCellIds = new Set<number>();
  const createdChildCellIds = new Set<number>();

  visibleCellIds.add(0);

  if (buildSteps.length === 0 || currentStepIndex < 0) {
    return {
      visibleCellIds,
      currentCellId: null,
      createdChildCellIds,
    };
  }

  const clampedStepIndex = Math.min(currentStepIndex, buildSteps.length - 1);

  for (let i = 0; i <= clampedStepIndex; i++) {
    const step = buildSteps[i];

    visibleCellIds.add(step.cellId);

    for (const childCellId of step.createdChildCellIds) {
      visibleCellIds.add(childCellId);
    }
  }

  const currentStep = buildSteps[clampedStepIndex];

  for (const childCellId of currentStep.createdChildCellIds) {
    createdChildCellIds.add(childCellId);
  }

  return {
    visibleCellIds,
    currentCellId: currentStep.cellId,
    createdChildCellIds,
  };
}

export function drawScene(
  canvas: HTMLCanvasElement,
  particles: Particle[],
  cells: Cell[],
  targetParticleIndex: number,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): void {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get 2D canvas context.");
  }

  const width = canvas.width;
  const height = canvas.height;

  clearCanvas(context, width, height);

  for (const cell of cells) {
    if (buildRenderState !== null && !buildRenderState.visibleCellIds.has(cell.id)) {
      continue;
    }
    drawCell(context, cell, width, height, traversalResult, buildRenderState);
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
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): void {
  const rect = toCanvasRect(cell.bounds, width, height);

  const fillStyle = getCellFillStyle(cell, traversalResult, buildRenderState);

  if (fillStyle !== null) {
    context.fillStyle = fillStyle;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  context.strokeStyle = getCellStrokeStyle(cell, buildRenderState);
  context.lineWidth = getCellLineWidth(cell, buildRenderState);

  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function getCellFillStyle(
  cell: Cell,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): string | null {
  if (buildRenderState !== null) {
    if (buildRenderState.createdChildCellIds.has(cell.id)) {
      return "rgba(59, 130, 246, 0.16)";
    }

    if (cell.isLeaf) {
      return "rgba(59, 130, 246, 0.04)";
    }

    return null;
  }

  if (traversalResult === null) {
    if (cell.isLeaf) {
      return "rgba(59, 130, 246, 0.04)";
    }

    return null;
  }

  if (traversalResult.acceptedCellIds.has(cell.id)) {
    return "rgba(34, 197, 94, 0.20)";
  }

  if (traversalResult.openedCellIds.has(cell.id)) {
    return "rgba(249, 115, 22, 0.14)";
  }

  if (traversalResult.directLeafCellIds.has(cell.id)) {
    return "rgba(168, 85, 247, 0.20)";
  }

  if (traversalResult.ignoredCellIds.has(cell.id)) {
    return "rgba(156, 163, 175, 0.08)";
  }

  if (cell.isLeaf) {
    return "rgba(59, 130, 246, 0.04)";
  }

  return null;
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

function getCellStrokeStyle(cell: Cell, buildRenderState: BuildRenderState | null): string {
  if (buildRenderState?.currentCellId === cell.id) {
    return "#2563eb";
  }

  if (cell.depth === 0) {
    return "#111827";
  }

  if (cell.depth <= 2) {
    return "#6b7280";
  }

  if (cell.depth <= 4) {
    return "#9ca3af";
  }

  return "#d1d5db";
}

function getCellLineWidth(cell: Cell, buildRenderState: BuildRenderState | null): number {
  if (buildRenderState?.currentCellId === cell.id) {
    return 3;
  }

  return cell.depth === 0 ? 2 : 1;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
