import "./style.css";
import { drawScene, generateParticles } from "./renderer";
import { buildTree } from "./tree";
import { traverseTree } from "./traversal";
import { clamp } from "./utils";

function getElementOrThrow<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

type VisualizationMode = "build" | "traverse";

const modeSelect = getElementOrThrow<HTMLSelectElement>("#mode-select");
const modeDescriptionTitle = getElementOrThrow<HTMLHeadingElement>("#mode-description-title");
const modeDescriptionText = getElementOrThrow<HTMLParagraphElement>("#mode-description-text");
const canvas = getElementOrThrow<HTMLCanvasElement>("#main-canvas");
const rerenderButton = getElementOrThrow<HTMLInputElement>("#rerender-button");
const particleCountSelect = getElementOrThrow<HTMLSelectElement>("#particle-count-select");
const particleSeed = getElementOrThrow<HTMLInputElement>("#particle-seed-input");
const targetParticleInput = getElementOrThrow<HTMLInputElement>("#target-particle-input");
const statsText = getElementOrThrow<HTMLElement>("#stats-text");
const thetaControl = getElementOrThrow<HTMLDivElement>("#theta-control");
const thetaSlider = getElementOrThrow<HTMLInputElement>("#theta-slider");
const thetaValue = getElementOrThrow<HTMLSpanElement>("#theta-value");

function render(): void {
  const mode = getVisualizationMode();

  const seed = Number(particleSeed.value);
  const particleCount = Number(particleCountSelect.value);
  const particles = generateParticles(particleCount, seed);
  const tree = buildTree(particles);
  const targetParticleIndex = getValidTargetParticleIndex(particleCount);

  thetaControl.hidden = mode !== "traverse";
  const theta = Number(thetaSlider.value);
  thetaValue.textContent = theta.toFixed(3);

  const traversalResult =
    mode === "traverse" ? traverseTree(tree, targetParticleIndex, theta) : null;

  drawScene(canvas, tree.particles, tree.cells, targetParticleIndex, traversalResult);

  updateDescription(mode);
  updateStats(mode, {
    particleCount,
    seed,
    targetParticleIndex,
    theta,
    cellCount: tree.cells.length,
    leafCellCount: tree.cells.filter((cell) => cell.isLeaf).length,
    maxDepth: Math.max(...tree.cells.map((cell) => cell.depth)),
    visitedCellCount: traversalResult?.visitedCellCount ?? null,
    acceptedCellCount: traversalResult?.acceptedCellCount ?? null,
    openedCellCount: traversalResult?.openedCellCount ?? null,
    directLeafCellCount: traversalResult?.directLeafCellCount ?? null,
  });
}

function getVisualizationMode(): VisualizationMode {
  if (modeSelect.value === "traverse") {
    return "traverse";
  }
  return "build";
}

function getValidTargetParticleIndex(particleCount: number): number {
  const rawValue = Number(targetParticleInput.value);

  const targetParticleIndex = Number.isFinite(rawValue) ? Math.trunc(rawValue) : 0;

  const clampedIndex = clamp(targetParticleIndex, 0, particleCount - 1);

  targetParticleInput.min = "0";
  targetParticleInput.max = String(particleCount - 1);
  targetParticleInput.value = String(clampedIndex);

  return clampedIndex;
}

function updateDescription(mode: VisualizationMode): void {
  if (mode === "build") {
    modeDescriptionTitle.textContent = "Build Tree Mode";
    modeDescriptionText.textContent =
      "粒子を含む正方形セルを再帰的に 4 分割します。" +
      "セル内の粒子数が 1 個以下になると、そのセルは葉として扱われます。" +
      "この階層構造が 2 次元版の tree code で使う quadtree です。";
    return;
  }

  modeDescriptionTitle.textContent = "Traverse Tree Mode";
  modeDescriptionText.textContent =
    "指定した粒子に対して root cell から順にセルを調べます。" +
    "遠くにあるセルは 1 つの質量分布としてまとめて扱い、近いセルはさらに子セルへ展開します。" +
    "判定には s / d < θ を使います。";
}

function updateStats(
  mode: VisualizationMode,
  stats: {
    particleCount: number;
    seed: number;
    targetParticleIndex: number;
    theta: number;
    cellCount: number;
    leafCellCount: number;
    maxDepth: number;
    visitedCellCount: number | null;
    acceptedCellCount: number | null;
    openedCellCount: number | null;
    directLeafCellCount: number | null;
  },
): void {
  const baseStats =
    `mode = ${mode}, ` +
    `N = ${stats.particleCount}, ` +
    `seed = ${stats.seed}, ` +
    `target = ${stats.targetParticleIndex}, ` +
    `theta = ${stats.theta.toFixed(1)}, ` +
    `cells = ${stats.cellCount}, ` +
    `leaves = ${stats.leafCellCount}, ` +
    `max depth = ${stats.maxDepth}`;

  if (mode === "build") {
    statsText.textContent = baseStats;
    return;
  }

  statsText.textContent =
    baseStats +
    `, visited = ${stats.visitedCellCount}, ` +
    `accepted = ${stats.acceptedCellCount}, ` +
    `opened = ${stats.openedCellCount}, ` +
    `direct leaves = ${stats.directLeafCellCount}`;
}

rerenderButton.addEventListener("click", () => {
  console.log("Rerender!");
  render();
});

targetParticleInput.addEventListener("change", () => {
  console.log("Rerender!");
  render();
});

modeSelect.addEventListener("change", () => {
  console.log("Rerender!");
  render();
});

thetaSlider.addEventListener("input", () => {
  console.log("Update theta slider!");
  render();
});

console.log("Hello!");
render();
