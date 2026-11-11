import { planCells, landmarks, planLabel, findRegistryGarage } from "./site-plan.js";
const SVG = "http://www.w3.org/2000/svg";
const DEFAULT_ANGLE = -20;
let camera;
function node(name, attributes = {}, text) {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}
export function renderMap(host, data, filters, matches, detailUrl) {
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
    viewBox: "0 0 1800 1900",
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
    angle = Number(localStorage.getItem("cooperative-map-angle") ?? DEFAULT_ANGLE);
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
  for (const row of ["1", "2", "3", "5", "6", "7", "8", "9", "10"]) {
    const cell = planCells.find((c) => c.row === row);
    const label = node(
      "text",
      { x: cell.x, y: cell.y - 45, class: "map-row", "text-anchor": "middle" },
      `Ряд ${row}`,
    );
    labels.push({ element: label, x: cell.x, y: cell.y - 45 });
    world.append(label);
  }
  for (const item of landmarks) {
    const group = node("g", { class: "map-landmark" });
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
    labels.push({ element: label, x: item.x, y: item.y });
    group.append(label);
    world.append(group);
  }
  const entrance = node("text", { x: 400, y: 1250, "text-anchor": "middle" }, "В’ЇЗД ↑");
  labels.push({ element: entrance, x: 400, y: 1250 });
  world.append(entrance);
  function centerCell(cell) {
    const radians = (angle * Math.PI) / 180;
    const x = cell.x - 550,
      y = cell.y - 800;
    panX = -zoom * (x * Math.cos(radians) - y * Math.sin(radians));
    panY = -zoom * (x * Math.sin(radians) + y * Math.cos(radians));
    update();
  }
  function update() {
    camera = { angle, zoom, panX, panY };
    world.setAttribute(
      "transform",
      `translate(${900 + panX} ${950 + panY}) scale(${zoom}) rotate(${angle}) translate(-550 -800)`,
    );
    for (const label of labels)
      label.element.setAttribute("transform", `rotate(${-angle} ${label.x} ${label.y})`);
    host.querySelector('[data-map="in"]').disabled = zoom >= 20;
    host.querySelector('[data-map="out"]').disabled = zoom <= 1;
  }
  function action(name) {
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
    try {
      localStorage.setItem("cooperative-map-angle", String(angle));
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
      const factor = Math.max(1800 / viewport.clientWidth, 1900 / viewport.clientHeight);
      panX = drag.panX + dx * factor;
      panY = drag.panY + dy * factor;
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
    zoom = 6;
    centerCell(visibleMatches[0].cell);
    visibleMatches[0].element.setAttribute("tabindex", "0");
    garageNodes[0].element.setAttribute(
      "tabindex",
      visibleMatches[0] === garageNodes[0] ? "0" : "-1",
    );
  }
  update();
  const count = garageNodes.filter((g) => g.match && g.cell.number !== null).length;
  const status = document.createElement("p");
  status.className = "map-count";
  status.textContent = hasFilter
    ? `На карті знайдено: ${count}. Непрочитані номери можуть бути відсутні серед результатів.`
    : "Номер ряду й повний номер боксу показуються після вибору.";
  host.prepend(status);
}
