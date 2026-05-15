import type { Cell, Tree } from "./tree";

export type TraversalAction = "accept" | "open" | "direct-leaf" | "ignore-self";

export type TraversalResult = {
  acceptedCellIds: Set<number>;
  openedCellIds: Set<number>;
  directLeafCellIds: Set<number>;
  ignoredCellIds: Set<number>;
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
  const acceptedCellIds = new Set<number>();
  const openedCellIds = new Set<number>();
  const directLeafCellIds = new Set<number>();
  const ignoredCellIds = new Set<number>();

  let visitedCellCount = 0;

  function visit(cellId: number): void {
    const cell = tree.cells[cellId];

    visitedCellCount += 1;

    if (containsOnlyTargetParticle(cell, targetParticleIndex)) {
      ignoredCellIds.add(cell.id);
      return;
    }

    if (cell.isLeaf) {
      directLeafCellIds.add(cell.id);
      return;
    }

    const ratio = calculateOpeningRatio(tree, cell, targetParticleIndex);

    if (ratio < theta) {
      acceptedCellIds.add(cell.id);
      return;
    }

    openedCellIds.add(cell.id);

    for (const childId of cell.children) {
      visit(childId);
    }
  }

  visit(tree.rootId);

  return {
    acceptedCellIds,
    openedCellIds,
    directLeafCellIds,
    ignoredCellIds,
    visitedCellCount,
    acceptedCellCount: acceptedCellIds.size,
    openedCellCount: openedCellIds.size,
    directLeafCellCount: directLeafCellIds.size,
  };
}

function containsOnlyTargetParticle(cell: Cell, targetParticleIndex: number): boolean {
  return cell.particleIndices.length === 1 && cell.particleIndices[0] === targetParticleIndex;
}

function calculateOpeningRatio(tree: Tree, cell: Cell, targetParticleIndex: number): number {
  const targetParticle = tree.particles[targetParticleIndex];

  const dx = cell.centerOfMass.x - targetParticle.position.x;
  const dy = cell.centerOfMass.y - targetParticle.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1.0e-12) {
    return Number.POSITIVE_INFINITY;
  }

  const cellSize = cell.bounds.xMax - cell.bounds.xMin;

  return cellSize / distance;
}
