import { formatCalendarDate, parseCalendarDate } from "./dates.js";
import { filterGarages, garageLabel, qualityIssues } from "./model.js";
import {
  garageMeterHistory,
  meterHistory,
  readSavedReadings,
  writeReadingBatch,
} from "./meter-readings.js";

const formatReading = new Intl.NumberFormat("uk-UA");

function meterHistoryTable({ entries, available }, escape) {
  const warning = available
    ? ""
    : '<p class="muted">Збережені в браузері показники недоступні.</p>';
  if (!entries.length) return warning + "<p>Показників лічильника ще немає.</p>";
  return (
    warning +
    `<table class="garage-table"><caption>Показники лічильника</caption>
    <thead><tr><th scope="col">Дата</th><th scope="col">Показник, кВт·год</th></tr></thead>
    <tbody>${entries.map((item) => `<tr><td class="garage-table-value">${escape(formatCalendarDate(item.date))}</td><td>${escape(formatReading.format(item.value))}</td></tr>`).join("")}</tbody></table>`
  );
}

export function canRecordMeterReadings(garage, issues) {
  return Boolean(
    garage.row &&
    garage.number &&
    garage.type !== "technical" &&
    !issues.some(
      ({ kind, garageIds }) =>
        (kind === "duplicate" || kind === "ambiguous") && garageIds.includes(garage.id),
    ),
  );
}

function renderReadingForm(body, garages, saved, escape, { row, onSave, onCancel }) {
  const readingInput = (garage, label) =>
    `<input type="text" inputmode="numeric" autocomplete="off" name="${escape(garage.id)}" aria-label="${escape(label)}">`;
  const fields = row
    ? `<table class="garage-table meter-table"><caption>Показники, кВт·год</caption>
        <thead><tr><th scope="col">Гараж</th><th scope="col">Було</th><th scope="col">Новий</th></tr></thead>
        <tbody>${garages
          .map((garage) => {
            const label = garageLabel(garage);
            const latest = meterHistory(garage.id, saved)[0];
            return `<tr><th scope="row">${escape(label)}</th>
            <td>${latest ? escape(formatReading.format(latest.value)) : "—"}</td>
            <td>${readingInput(garage, `Новий показник гаража ${label}`)}</td></tr>`;
          })
          .join("")}</tbody></table>`
    : `<label class="meter-date">Новий показник, кВт·год
        ${readingInput(garages[0], "Новий показник, кВт·год")}
      </label>`;
  const name = row ? `Показники ряду ${row}` : `Показники гаража ${garageLabel(garages[0])}`;
  body.innerHTML = `
    <form aria-label="${escape(name)}">
      <p class="muted">${row ? "Вкажіть одну дату для всього ряду у форматі ДД.ММ.РРРР. Порожні показники можна пропустити." : "Вкажіть дату зняття показника у форматі ДД.ММ.РРРР."}</p>
      <label class="meter-date">Дата зняття показників
        <input type="text" name="date" placeholder="12.11.2026" aria-required="true" autocomplete="off">
      </label>
      ${fields}
      <div class="garage-form-actions"><button type="button" data-save-readings>Зберегти показники</button><button type="button" data-cancel-readings>Скасувати</button></div>
      <p data-reading-error role="alert"></p>
    </form>`;
  const form = body.querySelector("form");
  const dateInput = form.elements.date;
  dateInput.focus();
  const error = form.querySelector("[data-reading-error]");
  form.addEventListener("input", () => {
    error.textContent = "";
    dateInput.removeAttribute("aria-invalid");
  });
  form.querySelector("[data-cancel-readings]").addEventListener("click", onCancel);
  function saveReadings() {
    const values = new FormData(form);
    const dateText = dateInput.value.trim();
    const date = parseCalendarDate(dateText);
    if (!date) {
      error.textContent = dateText
        ? "Введіть дійсну дату у форматі ДД.ММ.РРРР, наприклад 12.11.2026."
        : "Вкажіть дату зняття показників, наприклад 12.11.2026.";
      dateInput.setAttribute("aria-invalid", "true");
      dateInput.focus({ preventScroll: true });
      return;
    }

    const batch = [];
    try {
      const current = readSavedReadings();
      for (const g of garages) {
        const raw = values.get(g.id).trim();
        if (raw === "") continue;
        const value = Number(raw);
        const latest = meterHistory(g.id, current)[0];
        let problem = "";
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value > 999999999)
          problem = "введіть ціле число від 0 до 999 999 999.";
        else if (latest && date <= latest.date)
          problem = `виберіть дату після ${formatCalendarDate(latest.date)}.`;
        else if (latest && value < latest.value)
          problem = `новий показник менший за попередній (${formatReading.format(latest.value)}). Перевірте число.`;
        if (problem) {
          error.textContent = `Гараж ${garageLabel(g)} — ${problem}`;
          form.elements.namedItem(g.id).focus({ preventScroll: true });
          return;
        }
        batch.push({ garageId: g.id, date, value });
      }
      if (!batch.length) {
        error.textContent = "Введіть хоча б один показник.";
        return;
      }
      writeReadingBatch(current, batch);
    } catch {
      error.textContent = "Не вдалося зберегти показники. Перевірте налаштування браузера.";
      return;
    }
    onSave(batch.length);
  }

  // A preview can allow local scripts while blocking native form submission.
  form.querySelector("[data-save-readings]").addEventListener("click", saveReadings);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && !event.isComposing) {
      event.preventDefault();
      saveReadings();
    }
  });
}

export function renderGarageMeterReadings(host, garage, escape, canEdit) {
  function showHistory(message = "") {
    const history = garageMeterHistory(garage.id);
    const actions =
      canEdit && history.available
        ? `<div data-garage-meter-actions>
          <button type="button" data-edit-readings>Внести показники</button>
          <p data-reading-status role="status">${escape(message)}</p>
        </div>`
        : "";
    host.innerHTML = actions + meterHistoryTable(history, escape);
    const edit = host.querySelector("[data-edit-readings]");
    if (message) edit?.focus();
    edit?.addEventListener("click", () => {
      const actionsHost = host.querySelector("[data-garage-meter-actions]");
      let saved;
      try {
        saved = readSavedReadings();
      } catch {
        actionsHost.querySelector("[data-reading-status]").textContent =
          "Не вдалося відкрити збережені показники в цьому браузері.";
        return;
      }
      renderReadingForm(actionsHost, [garage], saved, escape, {
        onSave: () => showHistory("Збережено показників: 1."),
        onCancel: () => {
          showHistory();
          host.querySelector("[data-edit-readings]")?.focus();
        },
      });
    });
  }
  showHistory();
}

export function renderElectricity(host, data, openRow, garageHref, setOpenRow, escape) {
  const issues = qualityIssues(data);
  const rows = new Map();
  for (const garage of filterGarages(data)) {
    if (!canRecordMeterReadings(garage, issues)) continue;
    if (!rows.has(garage.row)) rows.set(garage.row, []);
    rows.get(garage.row).push(garage);
  }

  for (const [row, garages] of rows) {
    const section = document.createElement("details");
    section.className = "garage-category";
    section.setAttribute("name", "electricity-row");
    section.open = row === openRow;
    section.innerHTML = `<summary>Ряд ${escape(row)}</summary><div class="garage-category-body"></div>`;
    host.append(section);
    section.addEventListener("toggle", () => {
      if (section.isConnected) {
        const open = host.querySelector("details[open]");
        setOpenRow(open?.dataset.row);
      }
    });
    section.dataset.row = row;
    const body = section.querySelector(".garage-category-body");
    const link = (g) =>
      `<a class="meter-garage-link" data-record="${escape(g.id)}" href="${escape(garageHref(g.id, row))}">${escape(garageLabel(g))}</a>`;

    function showReadings(message = "") {
      let saved;
      try {
        saved = readSavedReadings();
      } catch {
        body.innerHTML =
          '<p role="alert">Не вдалося відкрити збережені показники в цьому браузері.</p>';
        return;
      }
      const tableRows = garages.map((g) => {
        const latest = meterHistory(g.id, saved)[0];
        return `<tr><th scope="row">${link(g)}</th><td>${latest ? escape(formatReading.format(latest.value)) : "—"}</td>
          <td class="garage-table-value">${latest ? escape(formatCalendarDate(latest.date)) : "—"}</td></tr>`;
      });
      body.innerHTML = `
        <table class="garage-table meter-table"><caption>Останні показники</caption>
        <thead><tr><th scope="col">Гараж</th><th scope="col">кВт·год</th><th scope="col">Дата</th></tr></thead>
        <tbody>${tableRows.join("")}</tbody></table>
        <button type="button" data-edit-readings>Внести показники</button>
        <p data-reading-status role="status">${escape(message)}</p>`;
      const edit = body.querySelector("[data-edit-readings]");
      edit.addEventListener("click", () =>
        renderReadingForm(body, garages, saved, escape, {
          row,
          onSave: (count) => showReadings(`Збережено показників: ${count}.`),
          onCancel: () => {
            showReadings();
            body.querySelector("[data-edit-readings]")?.focus();
          },
        }),
      );
      if (message) edit.focus();
    }

    showReadings();
  }
}
