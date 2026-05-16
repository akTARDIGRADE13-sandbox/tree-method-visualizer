import type { Cell, Tree } from "./tree";

export type TraversalAction = "accept" | "open" | "direct-leaf" | "ignore-self";

export type TraversalCellStep = {
  cellId: number;
  depth: number;
  action: TraversalAction;
  size: number;
  distance: number;
  ratio: number;
  theta: number;
};

export type TraversalDepthStep = {
  stepId: number;
  depth: number;
  cellSteps: TraversalCellStep[];
};

export type TraversalResult = {
  acceptedCellIds: Set<number>;
  openedCellIds: Set<number>;
  directLeafCellIds: Set<number>;
  ignoredCellIds: Set<number>;
  currentCellIds: Set<number>;
  currentDepthStep: TraversalDepthStep | null;
  visitedCellCount: number;
  acceptedCellCount: number;
  openedCellCount: number;
  directLeafCellCount: number;
};

export function traverseTree(
  tree: Tree,
  targetParticleIndex: number,
  theta: number,
): TraversalResult {
  const depthSteps = traverseTreeWithDepthSteps(tree, targetParticleIndex, theta);

  return createTraversalResultFromDepthSteps(depthSteps, depthSteps.length - 1);
}

export function traverseTreeWithDepthSteps(
  tree: Tree,
  targetParticleIndex: number,
  theta: number,
): TraversalDepthStep[] {
  const depthSteps: TraversalDepthStep[] = [];

  let frontier: number[] = [tree.rootId];

  while (frontier.length > 0) {
    const cellSteps: TraversalCellStep[] = [];
    const nextFrontier: number[] = [];

    for (const cellId of frontier) {
      const cell = tree.cells[cellId];
      const cellStep = judgeCell(tree, cell, targetParticleIndex, theta);

      cellSteps.push(cellStep);

      if (cellStep.action === "open") {
        for (const childId of cell.children) {
          nextFrontier.push(childId);
        }
      }
    }

    depthSteps.push({
      stepId: depthSteps.length,
      depth: cellSteps[0]?.depth ?? 0,
      cellSteps,
    });

    frontier = nextFrontier;
  }

  return depthSteps;
}

export function createTraversalResultFromDepthSteps(
  depthSteps: TraversalDepthStep[],
  currentDepthStepIndex: number,
): TraversalResult {
  const acceptedCellIds = new Set<number>();
  const openedCellIds = new Set<number>();
  const directLeafCellIds = new Set<number>();
  const ignoredCellIds = new Set<number>();
  const currentCellIds = new Set<number>();

  if (depthSteps.length === 0 || currentDepthStepIndex < 0) {
    return {
      acceptedCellIds,
      openedCellIds,
      directLeafCellIds,
      ignoredCellIds,
      currentCellIds,
      currentDepthStep: null,
      visitedCellCount: 0,
      acceptedCellCount: 0,
      openedCellCount: 0,
      directLeafCellCount: 0,
    };
  }

  const clampedStepIndex = Math.min(currentDepthStepIndex, depthSteps.length - 1);

  let visitedCellCount = 0;

  for (let i = 0; i <= clampedStepIndex; i++) {
    const depthStep = depthSteps[i];

    for (const cellStep of depthStep.cellSteps) {
      visitedCellCount += 1;

      if (cellStep.action === "accept") {
        acceptedCellIds.add(cellStep.cellId);
      } else if (cellStep.action === "open") {
        openedCellIds.add(cellStep.cellId);
      } else if (cellStep.action === "direct-leaf") {
        directLeafCellIds.add(cellStep.cellId);
      } else if (cellStep.action === "ignore-self") {
        ignoredCellIds.add(cellStep.cellId);
      }
    }
  }

  const currentDepthStep = depthSteps[clampedStepIndex];

  for (const cellStep of currentDepthStep.cellSteps) {
    currentCellIds.add(cellStep.cellId);
  }

  return {
    acceptedCellIds,
    openedCellIds,
    directLeafCellIds,
    ignoredCellIds,
    currentCellIds,
    currentDepthStep,
    visitedCellCount,
    acceptedCellCount: acceptedCellIds.size,
    openedCellCount: openedCellIds.size,
    directLeafCellCount: directLeafCellIds.size,
  };
}

function judgeCell(
  tree: Tree,
  cell: Cell,
  targetParticleIndex: number,
  theta: number,
): TraversalCellStep {
  const metrics = calculateOpeningMetrics(tree, cell, targetParticleIndex);

  if (containsOnlyTargetParticle(cell, targetParticleIndex)) {
    return {
      cellId: cell.id,
      depth: cell.depth,
      action: "ignore-self",
      size: metrics.size,
      distance: metrics.distance,
      ratio: metrics.ratio,
      theta,
    };
  }

  if (cell.isLeaf) {
    return {
      cellId: cell.id,
      depth: cell.depth,
      action: "direct-leaf",
      size: metrics.size,
      distance: metrics.distance,
      ratio: metrics.ratio,
      theta,
    };
  }

  if (metrics.ratio < theta) {
    return {
      cellId: cell.id,
      depth: cell.depth,
      action: "accept",
      size: metrics.size,
      distance: metrics.distance,
      ratio: metrics.ratio,
      theta,
    };
  }

  return {
    cellId: cell.id,
    depth: cell.depth,
    action: "open",
    size: metrics.size,
    distance: metrics.distance,
    ratio: metrics.ratio,
    theta,
  };
}

function containsOnlyTargetParticle(cell: Cell, targetParticleIndex: number): boolean {
  return cell.particleIndices.length === 1 && cell.particleIndices[0] === targetParticleIndex;
}

function calculateOpeningMetrics(
  tree: Tree,
  cell: Cell,
  targetParticleIndex: number,
): {
  size: number;
  distance: number;
  ratio: number;
} {
  const targetParticle = tree.particles[targetParticleIndex];

  const dx = cell.centerOfMass.x - targetParticle.position.x;
  const dy = cell.centerOfMass.y - targetParticle.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const size = cell.bounds.xMax - cell.bounds.xMin;

  if (distance < 1.0e-12) {
    return {
      size,
      distance,
      ratio: Number.POSITIVE_INFINITY,
    };
  }

  return {
    size,
    distance,
    ratio: size / distance,
  };
}
