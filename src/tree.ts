import type { Particle, Vec2 } from "./renderer";

export type Rect = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

export type Cell = {
  id: number;
  parentId: number | null;
  children: number[];
  depth: number;
  bounds: Rect;
  particleIndices: number[];
  mass: number;
  centerOfMass: Vec2;
  isLeaf: boolean;
};

export type Tree = {
  particles: Particle[];
  cells: Cell[];
  rootId: number;
  maxDepth: number;
};

const ROOT_BOUNDS: Rect = {
  xMin: 0.0,
  yMin: 0.0,
  xMax: 1.0,
  yMax: 1.0,
};

export function buildTree(particles: Particle[], maxDepth: number = 16): Tree {
  const cells: Cell[] = [];

  const rootParticleIndices = particles.map((particle) => particle.id);

  const rootId = createCell(cells, particles, null, 0, ROOT_BOUNDS, rootParticleIndices);

  subdivideCell(cells, particles, rootId, maxDepth);

  return {
    particles,
    cells,
    rootId,
    maxDepth,
  };
}

function subdivideCell(
  cells: Cell[],
  particles: Particle[],
  cellId: number,
  maxDepth: number,
): void {
  const cell = cells[cellId];

  if (cell.particleIndices.length <= 1) {
    cell.isLeaf = true;
    return;
  }

  if (cell.depth >= maxDepth) {
    cell.isLeaf = true;
    return;
  }

  const childBoundsList = splitRectIntoQuadrants(cell.bounds);
  const childParticleIndicesList: number[][] = [[], [], [], []];

  for (const particleIndex of cell.particleIndices) {
    const particle = particles[particleIndex];
    const quadrant = getQuadrant(cell.bounds, particle.position);
    childParticleIndicesList[quadrant].push(particleIndex);
  }

  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const childParticleIndices = childParticleIndicesList[quadrant];

    if (childParticleIndices.length === 0) {
      continue;
    }

    const childId = createCell(
      cells,
      particles,
      cell.id,
      cell.depth + 1,
      childBoundsList[quadrant],
      childParticleIndices,
    );

    cell.children.push(childId);
  }

  cell.isLeaf = false;

  for (const childId of cell.children) {
    subdivideCell(cells, particles, childId, maxDepth);
  }
}

function createCell(
  cells: Cell[],
  particles: Particle[],
  parentId: number | null,
  depth: number,
  bounds: Rect,
  particleIndices: number[],
): number {
  const id = cells.length;
  const mass = particleIndices.length;
  const centerOfMass = calculateCenterOfMass(particles, particleIndices);

  cells.push({
    id,
    parentId,
    children: [],
    depth,
    bounds,
    particleIndices,
    mass,
    centerOfMass,
    isLeaf: false,
  });

  return id;
}

function calculateCenterOfMass(particles: Particle[], particleIndices: number[]): Vec2 {
  if (particleIndices.length === 0) {
    return { x: 0.0, y: 0.0 };
  }

  let sumX = 0.0;
  let sumY = 0.0;

  for (const particleIndex of particleIndices) {
    const particle = particles[particleIndex];
    sumX += particle.position.x;
    sumY += particle.position.y;
  }

  return {
    x: sumX / particleIndices.length,
    y: sumY / particleIndices.length,
  };
}

function splitRectIntoQuadrants(bounds: Rect): Rect[] {
  const xMid = (bounds.xMin + bounds.xMax) * 0.5;
  const yMid = (bounds.yMin + bounds.yMax) * 0.5;

  return [
    {
      xMin: bounds.xMin,
      yMin: bounds.yMin,
      xMax: xMid,
      yMax: yMid,
    },
    {
      xMin: xMid,
      yMin: bounds.yMin,
      xMax: bounds.xMax,
      yMax: yMid,
    },
    {
      xMin: bounds.xMin,
      yMin: yMid,
      xMax: xMid,
      yMax: bounds.yMax,
    },
    {
      xMin: xMid,
      yMin: yMid,
      xMax: bounds.xMax,
      yMax: bounds.yMax,
    },
  ];
}

function getQuadrant(bounds: Rect, position: Vec2): number {
  const xMid = (bounds.xMin + bounds.xMax) * 0.5;
  const yMid = (bounds.yMin + bounds.yMax) * 0.5;

  const isRight = position.x >= xMid;
  const isTop = position.y >= yMid;

  if (!isRight && !isTop) {
    return 0;
  }

  if (isRight && !isTop) {
    return 1;
  }

  if (!isRight && isTop) {
    return 2;
  }

  return 3;
}
