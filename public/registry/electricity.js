import { filterGarages, garageLabel, qualityIssues } from "./model.js";
import {
  garageMeterHistory,
  isReadingDate,
  meterHistory,
  readingDateLabel,
  readSavedReadings,
  writeReadingBatch,
} from "./meter-readings.js";

const formatReading = new Intl.NumberFormat("uk-UA");

export function meterHistoryTable(garageId, escape) {
  const { entries, available } = garageMeterHistory(garageId);
  const warning = available
    ? ""
    : '<p class="muted">Збережені в браузері показники недоступні.</p>';
  if (!entries.length) return warning + "<p>Показників лічильника ще немає.</p>";
  return (
    warning +
    `<table class="garage-table"><caption>Показники лічильника</caption>
    <thead><tr><th scope="col">Дата</th><th scope="col">Показник, кВт·год</th></tr></thead>
    <tbody>${entries.map((item) => `<tr><td class="garage-table-value">${escape(readingDateLabel(item.date))}</td><td>${escape(formatReading.format(item.value))}</td></tr>`).join("")}</tbody></table>`
  );
}

export function renderElectricity(host, data, openRow, garageHref, setOpenRow, escape) {
  const uncertain = new Set(
    qualityIssues(data)
      .filter(({ kind }) => kind === "duplicate" || kind === "ambiguous")
      .flatMap(({ garageIds }) => garageIds),
  );
  const rows = new Map();
  for (const garage of filterGarages(data)) {
    if (!garage.row || !garage.number || garage.type === "technical" || uncertain.has(garage.id))
      continue;
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
          <td class="garage-table-value">${latest ? escape(readingDateLabel(latest.date)) : "—"}</td></tr>`;
      });
      body.innerHTML = `
        <table class="garage-table meter-table"><caption>Останні показники</caption>
        <thead><tr><th scope="col">Гараж</th><th scope="col">кВт·год</th><th scope="col">Дата</th></tr></thead>
        <tbody>${tableRows.join("")}</tbody></table>
        <button type="button" data-edit-readings>Внести показники</button>
        <p data-reading-status role="status">${escape(message)}</p>`;
      const edit = body.querySelector("[data-edit-readings]");
      edit.addEventListener("click", () => showForm(saved));
      if (message) edit.focus();
    }

    function showForm(saved) {
      const fields = garages.map((g) => {
        const latest = meterHistory(g.id, saved)[0];
        return `<tr><th scope="row">${escape(garageLabel(g))}</th>
          <td>${latest ? escape(formatReading.format(latest.value)) : "—"}</td>
          <td><input type="number" min="0" step="1" max="999999999" inputmode="numeric"
            name="${escape(g.id)}" aria-label="Новий показник гаража ${escape(garageLabel(g))}"></td></tr>`;
      });
      body.innerHTML = `
        <form aria-label="Показники ряду ${escape(row)}">
          <p class="muted">Вкажіть дату для всього ряду. Порожні поля можна пропустити.</p>
          <label class="meter-date">Дата зняття показників<input type="date" name="date" required></label>
          <table class="garage-table meter-table"><caption>Показники, кВт·год</caption>
          <thead><tr><th scope="col">Гараж</th><th scope="col">Попередній</th><th scope="col">Новий</th></tr></thead>
          <tbody>${fields.join("")}</tbody></table>
          <div class="garage-form-actions"><button type="submit">Зберегти показники</button><button type="button" data-cancel-readings>Скасувати</button></div>
          <p data-reading-error role="alert"></p>
        </form>`;
      const form = body.querySelector("form");
      form.elements.date.focus();
      const error = form.querySelector("[data-reading-error]");
      form.querySelector("[data-cancel-readings]").addEventListener("click", () => {
        showReadings();
        body.querySelector("[data-edit-readings]")?.focus();
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = new FormData(form);
        const date = values.get("date");
        if (!isReadingDate(date)) {
          error.textContent = "Вкажіть коректну дату зняття показників.";
          form.elements.date.focus();
          return;
        }

        try {
          const current = readSavedReadings();
          const batch = [];
          for (const g of garages) {
            const raw = values.get(g.id);
            if (raw === "") continue;
            const value = Number(raw);
            const latest = meterHistory(g.id, current)[0];
            let problem = "";
            if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value > 999999999)
              problem = "введіть ціле число від 0 до 999 999 999.";
            else if (latest && date <= latest.date)
              problem = `виберіть дату після ${readingDateLabel(latest.date)}.`;
            else if (latest && value < latest.value)
              problem = `новий показник менший за попередній (${formatReading.format(latest.value)}). Перевірте число.`;
            if (problem) {
              error.textContent = `Гараж ${garageLabel(g)} — ${problem}`;
              form.elements.namedItem(g.id).focus();
              return;
            }
            batch.push({ garageId: g.id, date, value });
          }
          if (!batch.length) {
            error.textContent = "Введіть хоча б один показник.";
            return;
          }
          writeReadingBatch(current, batch);
          showReadings(`Збережено показників: ${batch.length}.`);
        } catch {
          error.textContent = "Не вдалося зберегти показники. Перевірте налаштування браузера.";
        }
      });
    }

    showReadings();
  }
}
