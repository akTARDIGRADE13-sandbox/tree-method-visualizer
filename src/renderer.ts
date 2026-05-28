import type { BuildStep, Cell, Rect } from "./tree";
import type { TraversalResult } from "./traversal";
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

type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CANVAS_MARGIN = 40;

const PARTICLE_RADIUS = 1.5;
const TARGET_PARTICLE_RADIUS = 4;

const COLORS = {
  background: "#ffffff",

  particle: "#111111",
  targetParticle: "#dc2626",
  targetParticleStroke: "#ffffff",

  currentBuildCellStroke: "#2563eb",
  currentTraversalCellStroke: "#dc2626",

  rootCellStroke: "#111827",
  shallowCellStroke: "#6b7280",
  middleCellStroke: "#9ca3af",
  deepCellStroke: "#d1d5db",

  createdChildCellFill: "rgba(59, 130, 246, 0.16)",
  leafCellFill: "rgba(59, 130, 246, 0.04)",

  acceptedCellFill: "rgba(34, 197, 94, 0.20)",
  openedCellFill: "rgba(249, 115, 22, 0.14)",
  directLeafCellFill: "rgba(168, 85, 247, 0.20)",
  ignoredCellFill: "rgba(156, 163, 175, 0.08)",
} as const;

export function generateParticles(n: number, seed: number): Particle[] {
  const gridSize = Math.sqrt(n);

  if (!Number.isInteger(gridSize)) {
    throw new Error(`N must be a perfect square: ${n}`);
  }

  const cellSize = 1.0 / gridSize;
  const particles: Particle[] = [];
  const random = createRandom(seed);

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const baseX = (i + 0.5) / gridSize;
      const baseY = (j + 0.5) / gridSize;

      // Add a small random displacement within each regular grid cell.
      const dx = (random() - 0.5) * cellSize;
      const dy = (random() - 0.5) * cellSize;

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

  // The root cell should always be visible during build mode.
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
  const context = getCanvasContext(canvas);

  clearCanvas(context, canvas.width, canvas.height);

  drawCells(
    context,
    cells,
    canvas.width,
    canvas.height,
    traversalResult,
    buildRenderState,
  );

  drawParticles(
    context,
    particles,
    canvas.width,
    canvas.height,
    targetParticleIndex,
  );
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Failed to get 2D canvas context.");
  }

  return context;
}

function clearCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);

  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, width, height);
}

function drawCells(
  context: CanvasRenderingContext2D,
  cells: Cell[],
  width: number,
  height: number,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): void {
  for (const cell of cells) {
    if (!shouldDrawCell(cell, buildRenderState)) {
      continue;
    }

    drawCell(context, cell, width, height, traversalResult, buildRenderState);
  }
}

function shouldDrawCell(
  cell: Cell,
  buildRenderState: BuildRenderState | null,
): boolean {
  if (buildRenderState === null) {
    return true;
  }

  return buildRenderState.visibleCellIds.has(cell.id);
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

  context.strokeStyle = getCellStrokeStyle(cell, traversalResult, buildRenderState);
  context.lineWidth = getCellLineWidth(cell, traversalResult, buildRenderState);

  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function getCellFillStyle(
  cell: Cell,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): string | null {
  if (buildRenderState !== null) {
    return getBuildModeCellFillStyle(cell, buildRenderState);
  }

  if (traversalResult !== null) {
    return getTraversalModeCellFillStyle(cell, traversalResult);
  }

  return getDefaultCellFillStyle(cell);
}

function getBuildModeCellFillStyle(
  cell: Cell,
  buildRenderState: BuildRenderState,
): string | null {
  if (buildRenderState.createdChildCellIds.has(cell.id)) {
    return COLORS.createdChildCellFill;
  }

  return getDefaultCellFillStyle(cell);
}

function getTraversalModeCellFillStyle(
  cell: Cell,
  traversalResult: TraversalResult,
): string | null {
  if (traversalResult.acceptedCellIds.has(cell.id)) {
    return COLORS.acceptedCellFill;
  }

  if (traversalResult.openedCellIds.has(cell.id)) {
    return COLORS.openedCellFill;
  }

  if (traversalResult.directLeafCellIds.has(cell.id)) {
    return COLORS.directLeafCellFill;
  }

  if (traversalResult.ignoredCellIds.has(cell.id)) {
    return COLORS.ignoredCellFill;
  }

  return getDefaultCellFillStyle(cell);
}

function getDefaultCellFillStyle(cell: Cell): string | null {
  if (cell.isLeaf) {
    return COLORS.leafCellFill;
  }

  return null;
}

function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number,
  targetParticleIndex: number,
): void {
  for (const particle of particles) {
    const isTarget = particle.id === targetParticleIndex;

    drawParticle(context, particle, width, height, isTarget);
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
  context.arc(
    x,
    y,
    isTarget ? TARGET_PARTICLE_RADIUS : PARTICLE_RADIUS,
    0,
    Math.PI * 2,
  );

  context.fillStyle = isTarget ? COLORS.targetParticle : COLORS.particle;
  context.fill();

  if (isTarget) {
    context.strokeStyle = COLORS.targetParticleStroke;
    context.lineWidth = 2;
    context.stroke();
  }
}

function toCanvasRect(bounds: Rect, width: number, height: number): CanvasRect {
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
  const size = Math.min(width, height) - CANVAS_MARGIN * 2;

  return {
    x: CANVAS_MARGIN + position.x * size,
    y: CANVAS_MARGIN + (1.0 - position.y) * size,
  };
}

function getCellStrokeStyle(
  cell: Cell,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): string {
  if (buildRenderState?.currentCellId === cell.id) {
    return COLORS.currentBuildCellStroke;
  }

  if (traversalResult?.currentCellIds.has(cell.id)) {
    return COLORS.currentTraversalCellStroke;
  }

  if (cell.depth === 0) {
    return COLORS.rootCellStroke;
  }

  if (cell.depth <= 2) {
    return COLORS.shallowCellStroke;
  }

  if (cell.depth <= 4) {
    return COLORS.middleCellStroke;
  }

  return COLORS.deepCellStroke;
}

function getCellLineWidth(
  cell: Cell,
  traversalResult: TraversalResult | null,
  buildRenderState: BuildRenderState | null,
): number {
  if (buildRenderState?.currentCellId === cell.id) {
    return 3;
  }

  if (traversalResult?.currentCellIds.has(cell.id)) {
    return 3;
  }

  return cell.depth === 0 ? 2 : 1;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  // Linear congruential generator.
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
