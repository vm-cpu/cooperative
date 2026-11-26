import { planFrame } from "./site-plan.js";

export function rotatePoint(x, y, angle) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function fitScale(width, height, angle) {
  const radians = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(radians)),
    s = Math.abs(Math.sin(radians));
  return Math.min(
    (Math.max(width, 33) - 32) / (planFrame.width * c + planFrame.height * s),
    (Math.max(height, 33) - 32) / (planFrame.width * s + planFrame.height * c),
  );
}

export const planCenter = {
  x: planFrame.x + planFrame.width / 2,
  y: planFrame.y + planFrame.height / 2,
};
