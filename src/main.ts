import "./style.css";
import { createBuildRenderState, drawScene, generateParticles } from "./renderer";
import { buildTreeWithSteps } from "./tree";
import { createTraversalResultFromDepthSteps, traverseTreeWithDepthSteps } from "./traversal";
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
const stepBackwardButton = getElementOrThrow<HTMLButtonElement>("#step-backward-button");
const stepForwardButton = getElementOrThrow<HTMLButtonElement>("#step-forward-button");
const resetButton = getElementOrThrow<HTMLButtonElement>("#reset-button");
const playPauseButton = getElementOrThrow<HTMLButtonElement>("#play-pause-button");
const speedSlider = getElementOrThrow<HTMLInputElement>("#speed-slider");
const speedValue = getElementOrThrow<HTMLSpanElement>("#speed-value");

let currentBuildStepIndex = -1;
let currentTraversalDepthStepIndex = -1;
let isPlaying = false;
let animationTimerId: number | null = null;

function render(): void {
  const mode = getVisualizationMode();

  const seed = Number(particleSeed.value);
  const particleCount = Number(particleCountSelect.value);

  const particles = generateParticles(particleCount, seed);
  const { tree, buildSteps } = buildTreeWithSteps(particles);
  currentBuildStepIndex = clamp(currentBuildStepIndex, -1, buildSteps.length - 1);

  const targetParticleIndex = getValidTargetParticleIndex(particleCount);
  const buildRenderState =
    mode === "build" ? createBuildRenderState(buildSteps, currentBuildStepIndex) : null;

  thetaControl.hidden = mode !== "traverse";
  const theta = Number(thetaSlider.value);
  thetaValue.textContent = theta.toFixed(3);

  const speed = Number(speedSlider.value);

  speedValue.textContent = `${speed.toFixed(1)}x`;
  playPauseButton.textContent = isPlaying ? "Pause" : "Play";

  const traversalDepthSteps =
    mode === "traverse" ? traverseTreeWithDepthSteps(tree, targetParticleIndex, theta) : [];

  currentTraversalDepthStepIndex = clamp(
    currentTraversalDepthStepIndex,
    -1,
    traversalDepthSteps.length - 1,
  );

  const traversalResult =
    mode === "traverse"
      ? createTraversalResultFromDepthSteps(traversalDepthSteps, currentTraversalDepthStepIndex)
      : null;

  drawScene(
    canvas,
    tree.particles,
    tree.cells,
    targetParticleIndex,
    traversalResult,
    buildRenderState,
  );

  updateDescription(mode);
  updateStats(mode, {
    particleCount,
    seed,
    targetParticleIndex,
    theta,
    cellCount: tree.cells.length,
    leafCellCount: tree.cells.filter((cell) => cell.isLeaf).length,
    maxDepth: Math.max(...tree.cells.map((cell) => cell.depth)),
    currentBuildStepIndex,
    buildStepCount: buildSteps.length,
    currentTraversalDepthStepIndex,
    traversalDepthStepCount: traversalDepthSteps.length,
    currentTraversalDepthStep: traversalResult?.currentDepthStep ?? null,
    visitedCellCount: traversalResult?.visitedCellCount ?? null,
    acceptedCellCount: traversalResult?.acceptedCellCount ?? null,
    openedCellCount: traversalResult?.openedCellCount ?? null,
    directLeafCellCount: traversalResult?.directLeafCellCount ?? null,
  });
}

function startAnimation(): void {
  if (isPlaying) {
    return;
  }

  isPlaying = true;
  render();
  scheduleNextAnimationStep();
}

function pauseAnimation(): void {
  isPlaying = false;

  if (animationTimerId !== null) {
    window.clearTimeout(animationTimerId);
    animationTimerId = null;
  }

  render();
}

function toggleAnimation(): void {
  if (isPlaying) {
    pauseAnimation();
    return;
  }

  startAnimation();
}

function scheduleNextAnimationStep(): void {
  if (!isPlaying) {
    return;
  }

  const intervalMs = getAnimationIntervalMs();

  animationTimerId = window.setTimeout(() => {
    const didAdvance = advanceCurrentModeStep();

    if (!didAdvance) {
      pauseAnimation();
      return;
    }

    render();
    scheduleNextAnimationStep();
  }, intervalMs);
}

function getAnimationIntervalMs(): number {
  const speed = Number(speedSlider.value);

  if (!Number.isFinite(speed) || speed <= 0) {
    return 1000;
  }

  return 1000 / speed;
}

function advanceCurrentModeStep(): boolean {
  const mode = getVisualizationMode();

  if (mode === "build") {
    const buildStepCount = getCurrentBuildStepCount();

    if (currentBuildStepIndex >= buildStepCount - 1) {
      return false;
    }

    currentBuildStepIndex += 1;
    return true;
  }

  const traversalDepthStepCount = getCurrentTraversalDepthStepCount();

  if (currentTraversalDepthStepIndex >= traversalDepthStepCount - 1) {
    return false;
  }

  currentTraversalDepthStepIndex += 1;
  return true;
}

function getCurrentBuildStepCount(): number {
  const particleCount = Number(particleCountSelect.value);
  const seed = Number(particleSeed.value);
  const particles = generateParticles(particleCount, seed);
  const { buildSteps } = buildTreeWithSteps(particles);

  return buildSteps.length;
}

function getCurrentTraversalDepthStepCount(): number {
  const particleCount = Number(particleCountSelect.value);
  const seed = Number(particleSeed.value);
  const particles = generateParticles(particleCount, seed);
  const { tree } = buildTreeWithSteps(particles);

  const targetParticleIndex = getValidTargetParticleIndex(particleCount);
  const theta = Number(thetaSlider.value);

  const traversalDepthSteps = traverseTreeWithDepthSteps(
      tree,
      targetParticleIndex,
      theta,
  );

  return traversalDepthSteps.length;
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
    currentBuildStepIndex: number;
    buildStepCount: number;
    currentTraversalDepthStepIndex: number;
    traversalDepthStepCount: number;
    currentTraversalDepthStep: {
      stepId: number;
      depth: number;
      cellSteps: {
        cellId: number;
        depth: number;
        action: string;
        size: number;
        distance: number;
        ratio: number;
        theta: number;
      }[];
    } | null;
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
    statsText.textContent =
      baseStats + `, step = ${stats.currentBuildStepIndex + 1}` + ` / ${stats.buildStepCount}`;
    return;
  }

  const depthStep = stats.currentTraversalDepthStep;

  const currentDepthText =
    depthStep === null
      ? ", current depth = none"
      : `, depth step = ${stats.currentTraversalDepthStepIndex + 1}` +
        ` / ${stats.traversalDepthStepCount}` +
        `, current depth = ${depthStep.depth}` +
        `, frontier cells = ${depthStep.cellSteps.length}` +
        `, opened this depth = ${countAction(depthStep, "open")}` +
        `, accepted this depth = ${countAction(depthStep, "accept")}` +
        `, direct leaves this depth = ${countAction(depthStep, "direct-leaf")}` +
        `, ignored this depth = ${countAction(depthStep, "ignore-self")}`;

  statsText.textContent =
    baseStats +
    `, visited = ${stats.visitedCellCount}, ` +
    `accepted = ${stats.acceptedCellCount}, ` +
    `opened = ${stats.openedCellCount}, ` +
    `direct leaves = ${stats.directLeafCellCount}` +
    currentDepthText;
}

function countAction(
  depthStep: {
    cellSteps: {
      action: string;
    }[];
  },
  action: string,
): number {
  return depthStep.cellSteps.filter((cellStep) => cellStep.action === action).length;
}

rerenderButton.addEventListener("click", () => {
  pauseAnimation();

  currentBuildStepIndex = -1;
  currentTraversalDepthStepIndex = -1;
  render();
});

targetParticleInput.addEventListener("change", () => {
  currentBuildStepIndex = -1;
  currentTraversalDepthStepIndex = -1;
  render();
});

modeSelect.addEventListener("change", () => {
  pauseAnimation();

  console.log("Rerender!");
  render();
});

thetaSlider.addEventListener("input", () => {
  pauseAnimation();

  currentBuildStepIndex = -1;
  currentTraversalDepthStepIndex = -1;
  render();
});

speedSlider.addEventListener("input", () => {
  render();
});

playPauseButton.addEventListener("click", () => {
  toggleAnimation();
});

stepBackwardButton.addEventListener("click", () => {
  pauseAnimation();

  const mode = getVisualizationMode();

  if (mode === "build") {
    currentBuildStepIndex -= 1;
  } else {
    currentTraversalDepthStepIndex -= 1;
  }

  render();
});

stepForwardButton.addEventListener("click", () => {
  pauseAnimation();

  const mode = getVisualizationMode();

  if (mode === "build") {
    currentBuildStepIndex += 1;
  } else {
    currentTraversalDepthStepIndex += 1;
  }

  render();
});

resetButton.addEventListener("click", () => {
  pauseAnimation();

  const mode = getVisualizationMode();

  if (mode === "build") {
    currentBuildStepIndex = -1;
  } else {
    currentTraversalDepthStepIndex = -1;
  }

  render();
});

console.log("Hello!");
render();
