import "./style.css";
import { drawParticles, generateParticles } from "./renderer";

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

  drawParticles(canvas, particles, openingAngle);

  statsText.textContent = `N = ${particleCount}, seed = ${seed}`;
}

rerenderButton.addEventListener("click", () => {
  console.log("Hello!");
  render();
});

console.log("Hello!");
render();
