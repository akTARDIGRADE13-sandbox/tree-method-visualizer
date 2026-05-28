import "./style.css";

import {
  createBuildRenderState,
  drawScene,
  generateParticles,
} from "./renderer";
import { createTraversalResultFromDepthSteps, traverseTreeWithDepthSteps } from "./traversal";
import { buildTreeWithSteps } from "./tree";
import { clamp } from "./utils";

type VisualizationMode = "build" | "traverse";

type TraversalDepthStep = {
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
};

type Stats = {
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
  currentTraversalDepthStep: TraversalDepthStep | null;
  visitedCellCount: number | null;
  acceptedCellCount: number | null;
  openedCellCount: number | null;
  directLeafCellCount: number | null;
};

function getElementOrThrow<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

const elements = {
  modeSelect: getElementOrThrow<HTMLSelectElement>("#mode-select"),
  modeDescriptionTitle: getElementOrThrow<HTMLHeadingElement>("#mode-description-title"),
  modeDescriptionText: getElementOrThrow<HTMLParagraphElement>("#mode-description-text"),
  canvas: getElementOrThrow<HTMLCanvasElement>("#main-canvas"),

  rerenderButton: getElementOrThrow<HTMLButtonElement>("#rerender-button"),
  particleCountSelect: getElementOrThrow<HTMLSelectElement>("#particle-count-select"),
  particleSeedInput: getElementOrThrow<HTMLInputElement>("#particle-seed-input"),
  targetParticleInput: getElementOrThrow<HTMLInputElement>("#target-particle-input"),

  statsText: getElementOrThrow<HTMLElement>("#stats-text"),

  thetaControl: getElementOrThrow<HTMLDivElement>("#theta-control"),
  thetaSlider: getElementOrThrow<HTMLInputElement>("#theta-slider"),
  thetaValue: getElementOrThrow<HTMLSpanElement>("#theta-value"),

  stepBackwardButton: getElementOrThrow<HTMLButtonElement>("#step-backward-button"),
  stepForwardButton: getElementOrThrow<HTMLButtonElement>("#step-forward-button"),
  resetButton: getElementOrThrow<HTMLButtonElement>("#reset-button"),
  playPauseButton: getElementOrThrow<HTMLButtonElement>("#play-pause-button"),

  speedSlider: getElementOrThrow<HTMLInputElement>("#speed-slider"),
  speedValue: getElementOrThrow<HTMLSpanElement>("#speed-value"),
};

const state = {
  currentBuildStepIndex: -1,
  currentTraversalDepthStepIndex: -1,
  isPlaying: false,
  animationTimerId: null as number | null,
};

function render(): void {
  const mode = getVisualizationMode();
  const particleCount = getParticleCount();
  const seed = getSeed();

  const particles = generateParticles(particleCount, seed);
  const { tree, buildSteps } = buildTreeWithSteps(particles);

  state.currentBuildStepIndex = clamp(
    state.currentBuildStepIndex,
    -1,
    buildSteps.length - 1,
  );

  const targetParticleIndex = getValidTargetParticleIndex(particleCount);
  const theta = getTheta();

  elements.thetaControl.hidden = mode !== "traverse";
  elements.thetaValue.textContent = theta.toFixed(3);

  const speed = getAnimationSpeed();

  elements.speedValue.textContent = `${speed.toFixed(1)}x`;
  elements.playPauseButton.textContent = state.isPlaying ? "Pause" : "Play";

  const buildRenderState =
    mode === "build"
      ? createBuildRenderState(buildSteps, state.currentBuildStepIndex)
      : null;

  const traversalDepthSteps =
    mode === "traverse"
      ? traverseTreeWithDepthSteps(tree, targetParticleIndex, theta)
      : [];

  state.currentTraversalDepthStepIndex = clamp(
    state.currentTraversalDepthStepIndex,
    -1,
    traversalDepthSteps.length - 1,
  );

  const traversalResult =
    mode === "traverse"
      ? createTraversalResultFromDepthSteps(
          traversalDepthSteps,
          state.currentTraversalDepthStepIndex,
        )
      : null;

  drawScene(
    elements.canvas,
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
    currentBuildStepIndex: state.currentBuildStepIndex,
    buildStepCount: buildSteps.length,
    currentTraversalDepthStepIndex: state.currentTraversalDepthStepIndex,
    traversalDepthStepCount: traversalDepthSteps.length,
    currentTraversalDepthStep: traversalResult?.currentDepthStep ?? null,
    visitedCellCount: traversalResult?.visitedCellCount ?? null,
    acceptedCellCount: traversalResult?.acceptedCellCount ?? null,
    openedCellCount: traversalResult?.openedCellCount ?? null,
    directLeafCellCount: traversalResult?.directLeafCellCount ?? null,
  });
}

function startAnimation(): void {
  if (state.isPlaying) {
    return;
  }

  state.isPlaying = true;
  render();
  scheduleNextAnimationStep();
}

function pauseAnimation(): void {
  state.isPlaying = false;

  if (state.animationTimerId !== null) {
    window.clearTimeout(state.animationTimerId);
    state.animationTimerId = null;
  }

  render();
}

function toggleAnimation(): void {
  if (state.isPlaying) {
    pauseAnimation();
    return;
  }

  startAnimation();
}

function scheduleNextAnimationStep(): void {
  if (!state.isPlaying) {
    return;
  }

  state.animationTimerId = window.setTimeout(() => {
    const didAdvance = advanceCurrentModeStep();

    if (!didAdvance) {
      pauseAnimation();
      return;
    }

    render();
    scheduleNextAnimationStep();
  }, getAnimationIntervalMs());
}

function getAnimationIntervalMs(): number {
  const speed = getAnimationSpeed();

  if (!Number.isFinite(speed) || speed <= 0) {
    return 1000;
  }

  return 1000 / speed;
}

function advanceCurrentModeStep(): boolean {
  const mode = getVisualizationMode();

  if (mode === "build") {
    const buildStepCount = getCurrentBuildStepCount();

    if (state.currentBuildStepIndex >= buildStepCount - 1) {
      return false;
    }

    state.currentBuildStepIndex += 1;
    return true;
  }

  const traversalDepthStepCount = getCurrentTraversalDepthStepCount();

  if (state.currentTraversalDepthStepIndex >= traversalDepthStepCount - 1) {
    return false;
  }

  state.currentTraversalDepthStepIndex += 1;
  return true;
}

function getCurrentBuildStepCount(): number {
  const particles = generateParticles(getParticleCount(), getSeed());
  const { buildSteps } = buildTreeWithSteps(particles);

  return buildSteps.length;
}

function getCurrentTraversalDepthStepCount(): number {
  const particles = generateParticles(getParticleCount(), getSeed());
  const { tree } = buildTreeWithSteps(particles);

  const traversalDepthSteps = traverseTreeWithDepthSteps(
    tree,
    getValidTargetParticleIndex(getParticleCount()),
    getTheta(),
  );

  return traversalDepthSteps.length;
}

function getVisualizationMode(): VisualizationMode {
  return elements.modeSelect.value === "traverse" ? "traverse" : "build";
}

function getParticleCount(): number {
  return Number(elements.particleCountSelect.value);
}

function getSeed(): number {
  return Number(elements.particleSeedInput.value);
}

function getTheta(): number {
  return Number(elements.thetaSlider.value);
}

function getAnimationSpeed(): number {
  return Number(elements.speedSlider.value);
}

function getValidTargetParticleIndex(particleCount: number): number {
  const rawValue = Number(elements.targetParticleInput.value);
  const targetParticleIndex = Number.isFinite(rawValue) ? Math.trunc(rawValue) : 0;
  const clampedIndex = clamp(targetParticleIndex, 0, particleCount - 1);

  elements.targetParticleInput.min = "0";
  elements.targetParticleInput.max = String(particleCount - 1);
  elements.targetParticleInput.value = String(clampedIndex);

  return clampedIndex;
}

function resetAllStepIndices(): void {
  state.currentBuildStepIndex = -1;
  state.currentTraversalDepthStepIndex = -1;
}

function resetCurrentModeStepIndex(): void {
  const mode = getVisualizationMode();

  if (mode === "build") {
    state.currentBuildStepIndex = -1;
    return;
  }

  state.currentTraversalDepthStepIndex = -1;
}

function updateDescription(mode: VisualizationMode): void {
  if (mode === "build") {
    elements.modeDescriptionTitle.textContent = "Build Tree Mode";
    elements.modeDescriptionText.textContent =
      "粒子を含む正方形セルを再帰的に 4 分割します。" +
      "セル内の粒子数が 1 個以下になると、そのセルは葉として扱われます。" +
      "この階層構造が 2 次元版の tree code で使う quadtree です。";
    return;
  }

  elements.modeDescriptionTitle.textContent = "Traverse Tree Mode";
  elements.modeDescriptionText.textContent =
    "指定した粒子に対して root cell から順にセルを調べます。" +
    "遠くにあるセルは 1 つの質量分布としてまとめて扱い、近いセルはさらに子セルへ展開します。" +
    "判定には s / d < θ を使います。";
}

function updateStats(mode: VisualizationMode, stats: Stats): void {
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
    elements.statsText.textContent =
      baseStats +
      `, step = ${stats.currentBuildStepIndex + 1}` +
      ` / ${stats.buildStepCount}`;
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

  elements.statsText.textContent =
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

function stepBackward(): void {
  pauseAnimation();

  const mode = getVisualizationMode();

  if (mode === "build") {
    state.currentBuildStepIndex -= 1;
  } else {
    state.currentTraversalDepthStepIndex -= 1;
  }

  render();
}

function stepForward(): void {
  pauseAnimation();

  const mode = getVisualizationMode();

  if (mode === "build") {
    state.currentBuildStepIndex += 1;
  } else {
    state.currentTraversalDepthStepIndex += 1;
  }

  render();
}

function registerEventListeners(): void {
  elements.rerenderButton.addEventListener("click", () => {
    pauseAnimation();
    resetAllStepIndices();
    render();
  });

  elements.targetParticleInput.addEventListener("change", () => {
    resetAllStepIndices();
    render();
  });

  elements.modeSelect.addEventListener("change", () => {
    pauseAnimation();

    console.log("Rerender!");
    render();
  });

  elements.thetaSlider.addEventListener("input", () => {
    pauseAnimation();
    resetAllStepIndices();
    render();
  });

  elements.speedSlider.addEventListener("input", () => {
    render();
  });

  elements.playPauseButton.addEventListener("click", () => {
    toggleAnimation();
  });

  elements.stepBackwardButton.addEventListener("click", () => {
    stepBackward();
  });

  elements.stepForwardButton.addEventListener("click", () => {
    stepForward();
  });

  elements.resetButton.addEventListener("click", () => {
    pauseAnimation();
    resetCurrentModeStepIndex();
    render();
  });
}

registerEventListeners();

console.log("Hello!");
render();
