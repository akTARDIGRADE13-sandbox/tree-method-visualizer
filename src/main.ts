import "./style.css";
import { drawScene, generateParticles } from "./renderer";
import { buildTree } from "./tree";
import { clamp } from "./utils";

function getElementOrThrow<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

const canvas = getElementOrThrow<HTMLCanvasElement>("#main-canvas");
const rerenderButton = getElementOrThrow<HTMLInputElement>("#rerender-button");
const particleCountSelect = getElementOrThrow<HTMLSelectElement>("#particle-count-select");
const particleSeed = getElementOrThrow<HTMLInputElement>("#particle-seed-input");
const openingAngleInput = getElementOrThrow<HTMLInputElement>("#opening-angle-input");
const targetParticleInput = getElementOrThrow<HTMLInputElement>("#target-particle-input");
const statsText = getElementOrThrow<HTMLElement>("#stats-text");

function render(): void {
  const seed = Number(particleSeed.value);
  const openingAngle = Number(openingAngleInput.value);
  const particleCount = Number(particleCountSelect.value);
  const particles = generateParticles(particleCount, seed);
  const tree = buildTree(particles);
  const targetParticleIndex = getValidTargetParticleIndex(particleCount);

  drawScene(canvas, tree.particles, tree.cells, targetParticleIndex);

  const leafCellCount = tree.cells.filter((cell) => cell.isLeaf).length;
  const maxDepth = Math.max(...tree.cells.map((cell) => cell.depth));

  statsText.textContent =
    `N = ${particleCount}, ` +
    `seed = ${seed}, ` +
    `target = ${targetParticleIndex}, ` +
    `cells = ${tree.cells.length}, ` +
    `leaves = ${leafCellCount}, ` +
    `max depth = ${maxDepth}`;
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

rerenderButton.addEventListener("click", () => {
  console.log("Rerender!");
  render();
});

console.log("Hello!");
render();
