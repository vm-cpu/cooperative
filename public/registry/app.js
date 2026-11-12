import { formatCalendarDate } from "./dates.js";
import { renderContributionResults, renderGarageContributions } from "./contributions.js";
import { renderElectricity, renderGarageMeterReadings } from "./electricity.js";
import { renderTariffEditor } from "./electricity-tariffs.js";
import { garageMeterHistory } from "./meter-readings.js";
import { garageExamples } from "./garage-examples.js";
import {
  garageCategory,
  garageElectricitySection,
  garageReceiptsSection,
  renderGarageExample,
} from "./garage-card.js";
import {
  renderGarageElectricityPayments,
  renderGarageReceipts,
  renderReceiptResults,
} from "./garage-billing.js";
import { meterDetailsList, readMeterDetails, renderMeterDetailsEditor } from "./meter-details.js";
import { prepareGaragePeople, renderGaragePeople } from "./garage-people.js";
import { renderMap } from "./map.js";
import { renderOwnerEditor } from "./owner-editor.js";
import {
  prepareData,
  filterGarages,
  filterOwners,
  garageLabel,
  isConfirmedGarage,
  ownerGarages,
  rowSummary,
  qualityIssues,
  issueLabels,
} from "./model.js";
const screen = document.querySelector("#screen");
const main = document.querySelector("#main");
const directory = document.querySelector(".directory-panel");
const searchHost = directory.querySelector("#directory-search");
const pageStyle = document.documentElement.style;
new ResizeObserver(() => {
  pageStyle.setProperty("--directory-height", `${directory.offsetHeight}px`);
}).observe(directory);
const announcer = document.querySelector("#announcer");
const views = {
  garages: "Гаражі",
  owners: "Власники",
  rows: "Ряди",
  electricity: "Електрика",
  contributions: "Внески",
  receipts: "Квитанції",
  quality: "Якість даних",
};
let data;
let activeUrl = location.href;
let announceTimer;
const positions = new Map();
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const label = (g) => escape(garageLabel(g));
function route() {
  const [path, search = ""] = location.hash.slice(1).split("?");
  const [view = "garages", id] = (path || "garages").split("/");
  return { view, id, params: new URLSearchParams(search) };
}
function url(view, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== false && v !== null && v !== undefined,
    ),
  );
  return `#${view}${query.size ? "?" + query : ""}`;
}
function readFilters(params) {
  return {
    q: params.get("q") || "",
    row: params.get("row") || "",
    missing: params.get("missing") === "true",
    technical: params.get("technical") === "true",
    multiple: params.get("multiple") === "true",
    issue: params.get("issue") || "",
  };
}
function detailUrl(view, id, params = {}) {
  const r = route();
  const origin = ["garage", "owner"].includes(r.view)
    ? r.params.get("from") || "#garages"
    : location.hash || "#garages";
  return url(`${view}/${encodeURIComponent(id)}`, { from: origin, ...params });
}
function safeOrigin(value) {
  return /^#(garages|owners|rows|electricity|contributions|receipts|quality)(\?|$)/.test(
    value || "",
  )
    ? value
    : "#garages";
}
function announce(message) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    announcer.textContent = message;
  }, 180);
}
function title(text, subtitle, extra = "") {
  return `<div class="heading"><div><p class="eyebrow">ГБК «Ювілейний» · Довідник</p><h1>${text}</h1><p class="muted">${subtitle}</p></div>${extra}</div>`;
}
function garageItem(g) {
  const owner = data.ownerById.get(g.ownerId);
  return `<li class="record"><div><a class="record-link" data-record="${escape(g.id)}" href="${escape(detailUrl("garage", g.id))}">Гараж ${label(g)}</a><span class="record-meta">Ряд ${escape(g.row || "не вказано")}</span></div><div><p>${escape(owner?.name || "Власника не вказано")}</p>${g.tenant ? `<p class="record-meta">Орендар: ${escape(g.tenant.person.name)}</p>` : ""}${g.type === "technical" ? '<span class="status neutral">Технічний бокс</span>' : ""}${!g.ownerId ? '<span class="status">Без власника</span>' : ""}${g.needsNumberReview ? '<span class="status">Уточнити номер</span>' : ""}</div><a class="button quiet" href="${escape(detailUrl("garage", g.id))}" aria-label="Відкрити картку гаража ${label(g)}">Відкрити картку</a></li>`;
}
function empty() {
  return '<div class="empty"><h2>Нічого не знайдено</h2><p>Спробуйте інший номер чи ім’я або скиньте фільтри.</p><button type="button" data-reset>Скинути фільтри</button></div>';
}
function garageResults(filters) {
  const garages = filterGarages(data, filters);
  return `<div class="results-head"><p id="result-count">Знайдено: <strong>${garages.length}</strong> із ${data.garages.length}</p><p class="muted">За рядом та номером</p></div>${garages.length ? `<ul class="record-list" aria-label="Знайдені гаражі">${garages.map(garageItem).join("")}</ul>` : empty()}`;
}
function memberSinceLabel(owner) {
  return owner.memberSince
    ? `<time datetime="${escape(owner.memberSince)}">${escape(formatCalendarDate(owner.memberSince))}</time>`
    : "";
}
function ownerResults(filters) {
  const owners = filterOwners(data, filters);
  return `<div class="results-head"><p id="result-count">Знайдено: <strong>${owners.length}</strong> із ${data.owners.length}</p><p class="muted">За ім’ям</p></div>${
    owners.length
      ? `<ul class="record-list" aria-label="Знайдені власники">${owners
          .map((o) => {
            const garages = ownerGarages(data, o.id);
            const memberSince = memberSinceLabel(o);
            return `<li class="record owner"><div><h2><a class="record-link" data-record="${escape(o.id)}" href="${escape(detailUrl("owner", o.id))}">${escape(o.name)}</a></h2><p class="record-meta">Гаражів: ${garages.length} · ${garages.map(garageLabel).map(escape).join(", ") || "Немає пов’язаних гаражів"}</p>${memberSince ? `<p class="record-meta">Член кооперативу з ${memberSince}</p>` : ""}</div><a class="button quiet" href="${escape(detailUrl("owner", o.id))}" aria-label="Відкрити картку власника ${escape(o.name)}">Відкрити картку</a></li>`;
          })
          .join("")}</ul>`
      : empty()
  }`;
}
function renderSearch({ name, label, value, placeholder }) {
  searchHost.hidden = false;
  searchHost.innerHTML = `<form role="search" aria-label="${escape(name)}">
    <label for="search">${escape(label)}</label>
    <input id="search" type="search" autocomplete="off" value="${escape(value)}" placeholder="${escape(placeholder)}">
  </form>`;
  return searchHost.querySelector("input");
}

function bindSearch(input, results, update) {
  function search() {
    update();
    const top = results.getBoundingClientRect().top;
    const scrollPadding =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (top < scrollPadding || top >= window.innerHeight)
      results.scrollIntoView({ block: "start" });
  }
  input.addEventListener("input", search);
  input.form.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });
}

function listPage(view, params) {
  const filters = readFilters(params);
  const garages = view === "garages";
  const mapMode = garages && params.get("mode") === "map";
  const modes = garages
    ? `<div class="view-switch" role="group" aria-label="Вигляд гаражів"><a class="button ${mapMode ? "quiet" : ""}" href="${escape(url("garages", { ...filters, mode: "list" }))}" ${!mapMode ? 'aria-current="true"' : ""}>Список</a><a class="button ${mapMode ? "" : "quiet"}" href="${escape(url("garages", { ...filters, mode: "map" }))}" ${mapMode ? 'aria-current="true"' : ""}>Карта</a></div>`
    : "";
  const showMap = (values) =>
    renderMap(results, data, values, filterGarages(data, values), detailUrl);
  screen.innerHTML =
    title(
      views[view],
      garages
        ? "Знайдіть гараж за номером або ім’ям власника чи орендаря."
        : "Знайдіть власника та всі його гаражі.",
      `<span class="total">${garages ? data.garages.length : data.owners.length} ${garages ? "боксів" : "власників"}</span>`,
    ) +
    modes +
    (garages ? "" : '<div id="owner-editor"></div>') +
    `<form class="filters" id="filters" aria-label="Фільтри ${garages ? "гаражів" : "власників"}">
      ${
        garages
          ? `<div class="row-filter"><label for="row">Ряд</label><select id="row" name="row"><option value="">Усі ряди</option>${rowSummary(
              data,
            )
              .map(
                (r) =>
                  `<option value="${escape(r.row)}" ${r.row === filters.row ? "selected" : ""}>Ряд ${escape(r.row)}</option>`,
              )
              .join("")}</select></div>`
          : ""
      }
    <div class="filter-bottom">${garages ? `<label class="check"><input type="checkbox" name="missing" ${filters.missing ? "checked" : ""}/>Без власника</label><label class="check"><input type="checkbox" name="technical" ${filters.technical ? "checked" : ""}/>Технічні бокси</label>` : `<label class="check"><input type="checkbox" name="multiple" ${filters.multiple ? "checked" : ""}/>Кілька гаражів</label>`}<button type="button" data-reset>Скинути фільтри</button></div></form>
    ${filters.issue ? `<p class="notice">Перевірка: ${escape(issueLabels[filters.issue] || "невідома категорія")}. Щоб бачити всі гаражі, скиньте фільтри.</p>` : ""}<section id="results" aria-label="Результати пошуку">${mapMode ? "" : garages ? garageResults(filters) : ownerResults(filters)}</section>`;
  const results = screen.querySelector("#results");
  const form = screen.querySelector("#filters");
  const search = renderSearch({
    name: garages ? "Пошук гаражів" : "Пошук власників",
    label: garages ? "Номер гаража або ім’я людини" : "Ім’я власника",
    value: filters.q,
    placeholder: garages ? "Наприклад, 1-01" : "Наприклад, Тестова",
  });
  if (mapMode) showMap(filters);
  const update = () => {
    const values = new FormData(form);
    const next = {
      q: search.value,
      row: values.get("row"),
      missing: values.has("missing"),
      technical: values.has("technical"),
      multiple: values.has("multiple"),
      issue: filters.issue,
      mode: mapMode ? "map" : params.get("mode"),
    };
    history.replaceState(null, "", url(view, next));
    activeUrl = location.href;
    if (mapMode) showMap(next);
    else results.innerHTML = garages ? garageResults(next) : ownerResults(next);
    document.querySelectorAll(".view-switch a").forEach((link) => {
      const mode = new URLSearchParams(link.hash.split("?")[1]).get("mode");
      link.href = url("garages", { ...next, mode });
    });
    announce(
      document.querySelector("#result-count")?.textContent ||
        document.querySelector(".map-count")?.textContent ||
        "Нічого не знайдено",
    );
  };
  form.addEventListener("input", update);
  bindSearch(search, results, update);
  if (!garages) {
    const editor = screen.querySelector("#owner-editor");
    renderOwnerEditor(editor, data, escape, (owner) => {
      if (!filterOwners(data, readFilters(route().params)).includes(owner)) {
        search.value = owner.name;
        form.elements.multiple.checked = false;
      }
      screen.querySelector(".heading .total").textContent = `${data.owners.length} власників`;
      update();
    });
  }
}
function rowsPage() {
  const summaries = rowSummary(data);
  screen.innerHTML =
    title(
      "Ряди",
      "Оберіть ряд, щоб переглянути його гаражі. Це список груп, а не карта території.",
    ) +
    `<div class="card-grid">${summaries.map((r) => `<section class="panel"><h2>Ряд ${escape(r.row)}</h2><dl><dt>Усього боксів</dt><dd>${r.total}</dd><dt>З власником</dt><dd>${r.owned}</dd><dt>Без власника</dt><dd>${r.missing}</dd><dt>Технічних</dt><dd>${r.technical}</dd></dl><a class="button" href="${escape(url("garages", { row: r.row }))}">Гаражі ряду ${escape(r.row)}</a>${r.missing ? ` <a class="button quiet" href="${escape(url("garages", { row: r.row, missing: true }))}">Без власника: ${r.missing}</a>` : ""}${r.technical ? ` <a class="button quiet" href="${escape(url("garages", { row: r.row, technical: true }))}">Технічні: ${r.technical}</a>` : ""}</section>`).join("")}</div><p class="notice detail-section">Боксів без зазначеного ряду: ${data.garages.filter((g) => !g.row).length}. <a href="${url("garages", { issue: "row" })}">Переглянути записи без ряду</a></p>`;
}
function qualityPage() {
  const issues = qualityIssues(data);
  screen.innerHTML =
    title(
      "Якість даних",
      "У тестовому наборі навмисно є пропуски та повтори. Жодні записи не об’єднуються автоматично.",
    ) +
    `<div class="quality-list">${Object.entries(issueLabels)
      .map(([kind, name]) => {
        const group = issues.filter((i) => i.kind === kind);
        const ids = [...new Set(group.flatMap((i) => i.garageIds))];
        const ownerIds = [...new Set(group.flatMap((i) => i.ownerIds))];
        return `<section class="panel"><h2>${escape(name)}</h2><p class="muted">Випадків: ${group.length}${kind === "names" ? " · Людей: " + ownerIds.length : " · Записів: " + ids.length}</p>${ids.length ? `<a class="button quiet" href="${escape(url("garages", { issue: kind }))}">Переглянути записи (${ids.length})</a>` : "<p>Таких проблем немає.</p>"}${kind === "names" ? `<ul>${ownerIds.map((id) => `<li><a href="${escape(detailUrl("owner", id))}">${escape(data.ownerById.get(id).name)} · ${escape(id)}</a></li>`).join("")}</ul><p>Це різні ID. Збіг імені — причина для перевірки, а не доказ, що це одна людина.</p>` : ""}</section>`;
      })
      .join("")}</div>`;
}
function backLink(params) {
  const origin = safeOrigin(params.get("from"));
  const map =
    origin.startsWith("#garages?") &&
    new URLSearchParams(origin.split("?")[1]).get("mode") === "map";
  const destinations = { electricity: "ряду", contributions: "внесків", receipts: "квитанцій" };
  const destination = destinations[origin.slice(1).split("?")[0]] ?? (map ? "карти" : "списку");
  return `<a class="back" data-back href="${escape(origin)}">← Повернутися до ${destination}</a>`;
}
function electricityPage(params) {
  screen.innerHTML =
    title("Електрика", "Відкрийте ряд, щоб переглянути або внести показники.") +
    '<p class="muted">Тестові показники зберігаються в цьому браузері.</p><div id="electricity-tariffs"></div><div class="garage-categories" id="electricity-rows"></div>';
  renderTariffEditor(screen.querySelector("#electricity-tariffs"), escape);
  renderElectricity(
    screen.querySelector("#electricity-rows"),
    data,
    params.get("row"),
    (id, row) => url(`garage/${encodeURIComponent(id)}`, { from: url("electricity", { row }) }),
    (row) => {
      history.replaceState(null, "", url("electricity", { row }));
      activeUrl = location.href;
    },
    escape,
  );
}
function billingPage(view, params) {
  const receipts = view === "receipts";
  screen.innerHTML =
    title(
      views[view],
      receipts ? "Квитанції за гаражами." : "Членські та вступні внески по гаражах.",
    ) + '<section class="panel" data-billing-results></section>';
  const search = renderSearch({
    name: receipts ? "Пошук квитанцій" : "Пошук внесків",
    label: "Гараж або власник",
    value: params.get("q") || "",
    placeholder: "Наприклад, 1-01",
  });
  const results = screen.querySelector("[data-billing-results]");
  const update = () => {
    if (receipts) {
      renderReceiptResults(
        results,
        data,
        search.value,
        (id, receipt) => detailUrl("garage", id, { receipt }),
        escape,
      );
    } else {
      renderContributionResults(
        results,
        data,
        search.value,
        (id) => detailUrl("garage", id),
        escape,
      );
    }
  };
  bindSearch(search, results, () => {
    history.replaceState(null, "", url(view, { q: search.value }));
    activeUrl = location.href;
    update();
  });
  update();
}

function garagePage(id, params) {
  const g = data.garages.find((g) => g.id === id);
  if (!g) return missingPage();
  const owner = data.ownerById.get(g.ownerId);
  const allIssues = qualityIssues(data);
  const canEditReadings = isConfirmedGarage(g, allIssues);
  function mountGarageSections() {
    renderGaragePeople(
      screen.querySelector("[data-garage-people]"),
      data,
      g,
      (ownerId) => detailUrl("owner", ownerId),
      escape,
      () => {
        const name = screen.querySelector("[data-garage-owner-name]");
        if (name) name.textContent = data.ownerById.get(g.ownerId)?.name ?? "Без власника";
      },
    );
    const meter = screen.querySelector("[data-garage-meter]");
    const contributions = screen.querySelector("[data-garage-contributions]");
    const electricityPayments = screen.querySelector("[data-garage-electricity-payments]");
    const receipts = screen.querySelector("[data-garage-receipts]");
    const meterInfo = screen.querySelector("[data-electricity-meter-info]");
    const updateMeterInfo = (details) => {
      if (meterInfo) meterInfo.innerHTML = meterDetailsList(details, escape);
    };
    updateMeterInfo(readMeterDetails(id));
    renderMeterDetailsEditor(
      screen.querySelector("[data-meter-details]"),
      id,
      escape,
      updateMeterInfo,
    );
    function updatePayments() {
      if (contributions) renderGarageContributions(contributions, id, escape);
      if (electricityPayments) renderGarageElectricityPayments(electricityPayments, g, escape);
    }
    if (meter) renderGarageMeterReadings(meter, g, escape, canEditReadings);
    updatePayments();
    if (receipts) renderGarageReceipts(receipts, g, escape, canEditReadings, updatePayments);
  }
  if (garageExamples.has(id)) {
    screen.innerHTML = `<div class="details">${backLink(params)}${title(`Гараж ${label(g)}`, "Картка гаража · Вигадані дані")}<div id="garage-example"></div></div>`;
    renderGarageExample(screen.querySelector("#garage-example"), g, owner, escape);
    mountGarageSections();
    return;
  }
  const issues = allIssues.filter((i) => i.kind !== "owner" && i.garageIds.includes(id));
  const contributions = canEditReadings
    ? garageCategory("Внески", "<div data-garage-contributions></div>")
    : "";
  const electricity =
    canEditReadings || garageMeterHistory(id).entries.length ? garageElectricitySection() : "";
  screen.innerHTML = `<div class="details">${backLink(params)}${title(`Гараж ${label(g)}`, "Картка гаража · Вигадані дані")}<section class="panel"><h2>Про гараж</h2><dl><dt>Ряд</dt><dd>${escape(g.row || "Не вказано")}</dd><dt>Номер боксу</dt><dd>${escape(g.number || "Не вказано")}</dd><dt>Тип</dt><dd>${g.type === "technical" ? "Технічний бокс" : "Гараж"}</dd><dt>ID запису</dt><dd>${escape(g.id)}</dd></dl></section>
    <section class="panel detail-section" data-meter-details></section>
    <div class="garage-categories">
      ${garageCategory("Власник і орендар", "<div data-garage-people></div>")}
      ${issues.length ? `<section class="notice"><h2>Потрібно перевірити</h2><ul>${issues.map((i) => `<li>${escape(issueLabels[i.kind])}</li>`).join("")}</ul></section>` : ""}
      ${contributions}${electricity}${canEditReadings ? garageReceiptsSection() : ""}
    </div></div>`;
  mountGarageSections();
}
function ownerPage(id, params) {
  const o = data.ownerById.get(id);
  if (!o) return missingPage();
  const garages = ownerGarages(data, id);
  const memberSince = memberSinceLabel(o);
  const sameNames = data.owners.filter((other) => other.id !== id && other.name === o.name);
  screen.innerHTML = `<div class="details">${backLink(params)}${title(escape(o.name), "Картка власника · Вигадані дані")}<section class="panel"><h2>Про власника</h2><dl><dt>ID запису</dt><dd>${escape(o.id)}</dd><dt>Пов’язаних гаражів</dt><dd>${garages.length}</dd>${memberSince ? `<dt>Член кооперативу з</dt><dd>${memberSince}</dd>` : ""}${o.phone ? `<dt>Телефон</dt><dd>${escape(o.phone)}</dd>` : ""}${o.address ? `<dt>Адреса</dt><dd>${escape(o.address)}</dd>` : ""}</dl></section>${sameNames.length ? '<p class="notice detail-section">У довіднику є інші люди з таким самим ім’ям. Їхні картки залишаються окремими.</p>' : ""}<section class="detail-section" aria-labelledby="owner-garages"><h2 id="owner-garages">Гаражі власника</h2>${garages.length ? `<ul class="record-list">${garages.map(garageItem).join("")}</ul>` : "<p>Пов’язаних гаражів поки немає.</p>"}</section></div>`;
}
function missingPage() {
  screen.innerHTML =
    title(
      "Картку не знайдено",
      "Посилання може бути застарілим. Відкрийте список і знайдіть потрібний запис.",
    ) + '<a class="button" href="#garages">До списку гаражів</a>';
}
function render(focus = true) {
  if (!data) return;
  const { view, id, params } = route();
  searchHost.hidden = true;
  searchHost.replaceChildren();
  document.querySelectorAll("[data-view]").forEach((link) => {
    if (
      link.dataset.view === view ||
      (view === "garage" && link.dataset.view === "garages") ||
      (view === "owner" && link.dataset.view === "owners")
    )
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (["garages", "owners"].includes(view)) listPage(view, params);
  else if (view === "rows") rowsPage();
  else if (view === "electricity") electricityPage(params);
  else if (view === "contributions" || view === "receipts") billingPage(view, params);
  else if (view === "quality") qualityPage();
  else if (view === "garage") garagePage(id, params);
  else if (view === "owner") ownerPage(id, params);
  else missingPage();
  screen.setAttribute("aria-busy", "false");
  document.title = `${screen.querySelector("h1").textContent} — ГБК «Ювілейний»`;
  const saved = positions.get(location.href);
  if (focus) {
    if (saved) {
      const target = [...screen.querySelectorAll("[data-record]")].find(
        (el) => el.dataset.record === saved.record,
      );
      (target || main).focus({ preventScroll: true });
      window.scrollTo(0, saved.y);
    } else {
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }
  const receipt = params.get("receipt");
  if (view === "garage" && receipt) {
    const target = [...screen.querySelectorAll("[data-receipt]")].find(
      (el) => el.dataset.receipt === receipt,
    );
    if (target) {
      target.closest(".garage-category").open = true;
      target.open = true;
      const summary = target.querySelector("summary");
      summary.focus({ preventScroll: true });
      summary.scrollIntoView({ block: "center" });
    }
  }
}
screen.addEventListener("click", (e) => {
  if (e.target.closest("[data-reset]")) {
    const { view, params } = route();
    history.replaceState(null, "", url(view, { mode: params.get("mode") }));
    activeUrl = location.href;
    render(false);
    document.querySelector("#search")?.focus();
    announce("Фільтри скинуто. " + document.querySelector("#result-count")?.textContent);
  }
  if (e.target.closest("[data-retry]")) load();
});
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  if (link.classList.contains("skip")) {
    e.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start", behavior: "instant" });
    return;
  }
  const record =
    link.dataset.record ?? link.closest(".record")?.querySelector("[data-record]")?.dataset.record;
  const meterLink = link.matches(".meter-garage-link");
  if (meterLink) {
    const from = new URLSearchParams(link.hash.split("?")[1]).get("from");
    positions.set(new URL(safeOrigin(from), location.href).href, {
      y: window.scrollY,
      record: link.dataset.record,
    });
  }
  positions.set(activeUrl, { y: window.scrollY, record });
});
window.addEventListener("hashchange", () => {
  activeUrl = location.href;
  render();
});
window.addEventListener(
  "scroll",
  () => {
    const current = positions.get(activeUrl) || {};
    positions.set(activeUrl, { ...current, y: window.scrollY });
  },
  { passive: true },
);
function connection() {
  document.querySelector("#connection").hidden = navigator.onLine;
}
window.addEventListener("offline", connection);
window.addEventListener("online", connection);
connection();
async function load() {
  screen.setAttribute("aria-busy", "true");
  screen.innerHTML = title("Відкриваємо довідник", "Завантажуємо вигадані дані…");
  try {
    const response = await fetch("/registry/demo.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
      throw new Error("Load failed");
    data = prepareData(await response.json());
    prepareGaragePeople(data);
    render(false);
  } catch {
    screen.setAttribute("aria-busy", "false");
    screen.innerHTML =
      title(
        "Не вдалося відкрити довідник",
        "Перевірте інтернет. Якщо сеанс завершився, увійдіть повторно.",
      ) +
      '<div class="empty" role="alert"><p>Дані не завантажено. Спробуйте ще раз.</p><button type="button" data-retry>Спробувати ще раз</button> <a class="button quiet" href="/">Оновити сторінку й увійти</a></div>';
  }
}
load();
