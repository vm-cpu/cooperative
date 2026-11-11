import {
  planCells,
  landmarks,
  planLabel,
  findRegistryGarage,
  rowLabels,
  entrance,
} from "./site-plan.js";
import { fitScale, planCenter, rotatePoint } from "./map-camera.js";
const SVG = "http://www.w3.org/2000/svg";
const DEFAULT_ANGLE = 0;
// Versioned preference: the old coordinate system used a different zero direction.
const ANGLE_KEY = "cooperative-map-angle-v2";
let disposeMap = () => {};
let camera;
function node(name, attributes = {}, text) {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}
export function renderMap(host, data, filters, matches, detailUrl) {
  disposeMap();
  host.innerHTML = `<div class="map-controls" aria-label="Керування картою">
    <button type="button" data-map="in">Збільшити</button><button type="button" data-map="out">Зменшити</button>
    <button type="button" data-map="left">↶ Ліворуч</button><button type="button" data-map="right">Праворуч ↷</button>
    <button type="button" data-map="reset">Початковий вигляд</button>
    </div><p class="map-help">КПП — зі сторони в’їзду. Перетягніть карту або використайте клавіші зі стрілками. «?» — номер уточнюється.</p>
    <div class="map-viewport" tabindex="0" role="region" aria-label="Карта кооперативу. Стрілки пересувають карту, плюс і мінус змінюють масштаб."></div>
    <div class="map-selection" aria-live="polite"><p>Оберіть бокс на карті, щоб переглянути номер і доступну картку.</p></div>
    <p class="map-disclaimer">Чернетка за фото паперового плану. Розміри приблизні. Номери зі знаком «?» та межі потребують звірки. Власники у картках вигадані.</p>`;
  const viewport = host.querySelector(".map-viewport");
  const selection = host.querySelector(".map-selection");
  const svg = node("svg", {
    viewBox: "0 0 1000 600",
    role: "group",
    "aria-label": "Схема розташування гаражів",
  });
  const world = node("g");
  svg.append(world);
  viewport.append(svg);
  let angle = DEFAULT_ANGLE;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let selected;
  let drag;
  let dragged = false;
  try {
    angle = Number(localStorage.getItem(ANGLE_KEY) ?? DEFAULT_ANGLE);
  } catch {
    /* Storage can be disabled. */
  }
  if (!Number.isFinite(angle)) angle = DEFAULT_ANGLE;
  if (camera) ({ angle, zoom, panX, panY } = camera);
  const matchingIds = new Set(matches.map((g) => g.id));
  const query = (filters.q || "").trim().toLocaleLowerCase("uk");
  const hasFilter = Boolean(
    query || filters.row || filters.missing || filters.technical || filters.issue,
  );
  const labels = [];
  const garageNodes = [];
  function choose(cell, group) {
    selected?.classList.remove("selected");
    selected = group;
    group.classList.add("selected");
    selection.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = cell.number === null ? "Номер уточнюється" : `Гараж ${planLabel(cell)}`;
    const info = document.createElement("p");
    info.textContent = `Ряд ${cell.row} · Місце на схемі ${cell.id}`;
    selection.append(heading, info);
    const garage = findRegistryGarage(data, cell);
    if (garage) {
      const link = document.createElement("a");
      link.className = "button";
      link.href = detailUrl("garage", garage.id);
      link.textContent = "Відкрити картку гаража";
      selection.append(link);
    } else {
      const note = document.createElement("p");
      note.textContent =
        cell.number === null
          ? "Повідомте позначення місця та правильний номер для звірки."
          : "Цього гаража ще немає у тестовому реєстрі.";
      selection.append(note);
    }
  }
  for (const cell of planCells) {
    const garage = findRegistryGarage(data, cell);
    const directMatch =
      cell.number !== null && planLabel(cell).toLocaleLowerCase("uk").includes(query);
    const rowMatch = !filters.row || cell.row === filters.row;
    const needsRegistry = filters.missing || filters.technical || filters.issue;
    const match =
      rowMatch && (garage ? matchingIds.has(garage.id) : !needsRegistry && (!query || directMatch));
    const group = node("g", {
      class: `map-cell${cell.number === null ? " uncertain" : ""}${hasFilter && match ? " match" : ""}${hasFilter && !match ? " dimmed" : ""}`,
      tabindex: garageNodes.length === 0 ? 0 : -1,
      role: "button",
      "aria-label":
        cell.number === null
          ? `Ряд ${cell.row}, номер уточнюється, місце ${cell.id}`
          : `Гараж ${planLabel(cell)}`,
      "data-cell": cell.id,
    });
    group.append(node("polygon", { points: cell.points.map((p) => p.join(",")).join(" ") }));
    const label = node(
      "text",
      {
        x: cell.x,
        y: cell.y,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "aria-hidden": "true",
      },
      cell.number ?? "?",
    );
    group.append(label);
    labels.push({ element: label, x: cell.x, y: cell.y });
    group.addEventListener("click", () => {
      if (!dragged) choose(cell, group);
    });
    group.addEventListener("focus", () => {
      for (const item of garageNodes)
        item.element.setAttribute("tabindex", item.element === group ? "0" : "-1");
    });
    group.addEventListener("keydown", (event) => {
      const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (offset) {
        event.preventDefault();
        event.stopPropagation();
        const index = garageNodes.findIndex((item) => item.element === group);
        const next = garageNodes[(index + offset + garageNodes.length) % garageNodes.length];
        centerCell(next.cell);
        next.element.focus({ preventScroll: true });
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(cell, group);
      }
    });
    world.append(group);
    garageNodes.push({ cell, match, element: group });
  }
  for (const item of rowLabels) {
    const label = node(
      "text",
      {
        x: item.x,
        y: item.y,
        class: "map-row",
        "text-anchor": "middle",
        "dominant-baseline": "central",
      },
      item.name,
    );
    labels.push({ element: label, x: item.x, y: item.y });
    world.append(label);
  }
  for (const item of landmarks) {
    const group = node("g", { class: "map-landmark", "data-landmark": item.id });
    group.append(
      node("rect", {
        x: item.x - item.w / 2,
        y: item.y - item.h / 2,
        width: item.w,
        height: item.h,
        rx: 3,
      }),
    );
    const label = node(
      "text",
      { x: item.x, y: item.y, "text-anchor": "middle", "dominant-baseline": "central" },
      item.name,
    );
    labels.push({ element: label, x: item.x, y: item.y, landmark: item });
    group.append(label);
    world.append(group);
  }
  const entranceLabel = node(
    "text",
    { x: entrance.x, y: entrance.y, class: "map-entrance", "text-anchor": "middle" },
    "В’ЇЗД ↑",
  );
  labels.push({ element: entranceLabel, x: entrance.x, y: entrance.y });
  world.append(entranceLabel);
  let width = viewport.clientWidth,
    height = viewport.clientHeight;
  const scale = () => fitScale(width, height, angle) * zoom;
  function centerCell(cell) {
    const position = rotatePoint(cell.x - planCenter.x, cell.y - planCenter.y, angle);
    panX = -scale() * position.x;
    panY = -scale() * position.y;
    update();
  }
  function update() {
    camera = { angle, zoom, panX, panY };
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    world.setAttribute(
      "transform",
      `translate(${width / 2 + panX} ${height / 2 + panY}) scale(${scale()}) rotate(${angle}) translate(${-planCenter.x} ${-planCenter.y})`,
    );
    for (const label of labels) {
      label.element.setAttribute("transform", `rotate(${-angle} ${label.x} ${label.y})`);
      if (label.landmark) {
        const { w, h, name } = label.landmark;
        const radians = (angle * Math.PI) / 180;
        const available = Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians));
        label.element.style.fontSize = `${Math.min(17, (available - 6) / (name.length * 0.65))}px`;
      }
    }
    host.querySelector('[data-map="in"]').disabled = zoom >= 20;
    host.querySelector('[data-map="out"]').disabled = zoom <= 1;
  }
  function action(name) {
    const oldAngle = angle,
      oldScale = scale();
    if (name === "in") zoom = Math.min(20, zoom * 1.5);
    if (name === "out") zoom = Math.max(1, zoom / 1.5);
    if (name === "left") angle -= 90;
    if (name === "right") angle += 90;
    if (name === "reset") {
      angle = DEFAULT_ANGLE;
      zoom = 1;
      panX = 0;
      panY = 0;
    }
    angle = (angle + 360) % 360;
    if (name !== "reset") {
      const rotatedPan = rotatePoint(panX, panY, angle - oldAngle);
      panX = (rotatedPan.x * scale()) / oldScale;
      panY = (rotatedPan.y * scale()) / oldScale;
    }
    try {
      localStorage.setItem(ANGLE_KEY, String(angle));
    } catch {
      /* Optional preference. */
    }
    update();
  }
  host.querySelector(".map-controls").addEventListener("click", (e) => {
    if (e.target.dataset.map) action(e.target.dataset.map);
  });
  viewport.addEventListener("keydown", (event) => {
    const movement = {
      ArrowLeft: [100, 0],
      ArrowRight: [-100, 0],
      ArrowUp: [0, 100],
      ArrowDown: [0, -100],
    }[event.key];
    if (movement) {
      event.preventDefault();
      panX += movement[0];
      panY += movement[1];
      update();
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      action("in");
    }
    if (event.key === "-") {
      event.preventDefault();
      action("out");
    }
  });
  viewport.addEventListener("pointerdown", (event) => {
    // Native focus on a zoomed SVG child can scroll the clipped viewport itself.
    // Keep panning exclusively in the camera transform and focus without scrolling.
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    dragged = false;
    drag = { x: event.clientX, y: event.clientY, panX, panY };
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) {
      dragged = true;
      viewport.setPointerCapture(event.pointerId);
    }
    if (dragged) {
      panX = drag.panX + dx;
      panY = drag.panY + dy;
      update();
    }
  });
  viewport.addEventListener("pointerup", () => {
    drag = null;
  });
  viewport.addEventListener("pointercancel", () => {
    drag = null;
    dragged = false;
  });
  const visibleMatches = garageNodes.filter((g) => g.match && g.cell.number !== null);
  if (hasFilter && visibleMatches.length === 1) {
    zoom = Math.min(20, Math.max(6, 2 / fitScale(width, height, angle)));
    centerCell(visibleMatches[0].cell);
    visibleMatches[0].element.setAttribute("tabindex", "0");
    garageNodes[0].element.setAttribute(
      "tabindex",
      visibleMatches[0] === garageNodes[0] ? "0" : "-1",
    );
  }
  update();
  const observer = new ResizeObserver(() => {
    if (!viewport.isConnected) return;
    const oldScale = scale();
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    panX *= scale() / oldScale;
    panY *= scale() / oldScale;
    update();
  });
  observer.observe(viewport);
  disposeMap = () => observer.disconnect();
  const count = garageNodes.filter((g) => g.match && g.cell.number !== null).length;
  const status = document.createElement("p");
  status.className = "map-count";
  status.textContent = hasFilter
    ? `На карті знайдено: ${count}. Непрочитані номери можуть бути відсутні серед результатів.`
    : "Номер ряду й повний номер боксу показуються після вибору.";
  host.prepend(status);
}
