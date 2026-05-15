import "./style.css";
import { drawScene, generateParticles } from "./renderer";
import { buildTree } from "./tree";

function getElementOrThrow<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}

const canvas = getElementOrThrow<HTMLCanvasElement>("#main-canvas");
const rerenderButton = document.querySelector<HTMLInputElement>("#rerender-button");
const particleCountSelect = getElementOrThrow<HTMLSelectElement>("#particle-count-select");
const particleSeed = getElementOrThrow<HTMLInputElement>("#particle-seed-input");
const openingAngleInput = getElementOrThrow<HTMLInputElement>("#opening-angle-input");
const statsText = getElementOrThrow<HTMLElement>("#stats-text");

function render(): void {
  const seed = Number(particleSeed.value);
  const openingAngle = Number(openingAngleInput.value);
  const particleCount = Number(particleCountSelect.value);
  const particles = generateParticles(particleCount, seed);
  const tree = buildTree(particles);

  drawScene(canvas, tree.particles, tree.cells);

  const leafCellCount = tree.cells.filter((cell) => cell.isLeaf).length;
  const maxDepth = Math.max(...tree.cells.map((cell) => cell.depth));

  statsText.textContent =
    `N = ${particleCount}, ` +
    `seed = ${seed}, ` +
    `cells = ${tree.cells.length}, ` +
    `leaves = ${leafCellCount}, ` +
    `max depth = ${maxDepth}`;
}

rerenderButton.addEventListener("click", () => {
  console.log("Rerender!");
  render();
});

console.log("Hello!");
render();
