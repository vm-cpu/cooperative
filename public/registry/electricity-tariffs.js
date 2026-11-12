import { formatCalendarDate, isCalendarDate, parseCalendarDate } from "./dates.js";
import { monthPeriod, parseAmount, periodLabel, tableAmount } from "./payment-data.js";

const storageKey = "cooperative.demo.electricity-tariffs.v1";

export function tariffHistory() {
  try {
    const entries = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (
      !Array.isArray(entries) ||
      !entries.every(
        (item) =>
          item &&
          isCalendarDate(item.date) &&
          Number.isInteger(item.rate) &&
          item.rate > 0 &&
          item.rate <= 100000000,
      )
    ) {
      throw new Error("Invalid tariffs");
    }
    return { entries: entries.sort((a, b) => a.date.localeCompare(b.date)), available: true };
  } catch {
    return { entries: [], available: false };
  }
}

function previousMonth(month) {
  const [year, number] = month.split("-").map(Number);
  return number === 1
    ? `${String(year - 1).padStart(4, "0")}-12`
    : `${String(year).padStart(4, "0")}-${String(number - 1).padStart(2, "0")}`;
}

export function electricityCharge(previous, current, tariffs) {
  const start = previous.date.slice(0, 7);
  const currentMonth = current.date.slice(0, 7);
  const end =
    currentMonth !== start && current.date.endsWith("-01")
      ? previousMonth(currentMonth)
      : currentMonth;
  const period = monthPeriod(start, end);
  const usage = current.value - previous.value;
  if (usage === 0) return { period, usage, amount: 0 };

  // A tariff entered during a month applies to that whole month.
  const ratesByMonth = new Map(tariffs.map(({ date, rate }) => [date.slice(0, 7), rate]));
  let rate;
  for (const [month, monthRate] of ratesByMonth) {
    if (month <= start) rate = monthRate;
    else if (month <= end && rate !== undefined && monthRate !== rate)
      return { period, usage, reason: "mixed" };
  }
  if (rate === undefined) return { period, usage, reason: "missing" };
  const amount = usage * rate;
  return Number.isSafeInteger(amount)
    ? { period, usage, amount }
    : { period, usage, reason: "overflow" };
}

export function renderTariffEditor(host, escape) {
  const history = tariffHistory();
  if (!history.available) {
    host.innerHTML = '<p role="status">Збережені тарифи недоступні в цьому браузері.</p>';
    return;
  }
  host.innerHTML = `
    <details class="garage-form">
      <summary>Тарифи на електрику</summary>
      <div class="garage-category-body">
        <p>Тариф спільний для всіх гаражів. Він діє з початку місяця, на який припадає дата зміни.</p>
        <div data-tariff-history></div>
        <form aria-label="Тариф на електрику">
          <div class="garage-form-fields">
            <label>Дата зміни тарифу<input name="date" type="text" placeholder="15.11.2026" autocomplete="off" aria-required="true"></label>
            <label>Тариф, грн за кВт·год<input name="rate" type="text" inputmode="decimal" placeholder="5,00" autocomplete="off" aria-required="true"></label>
          </div>
          <div class="garage-form-actions"><button type="button" data-save-tariff>Зберегти тариф</button></div>
          <p role="alert"></p>
          <p role="status"></p>
        </form>
      </div>
    </details>`;
  const results = host.querySelector("[data-tariff-history]");
  const form = host.querySelector("form");
  const error = form.querySelector("[role=alert]");
  const status = form.querySelector("[role=status]");

  function update(entries) {
    results.innerHTML = entries.length
      ? `<table class="garage-table"><caption>Історія тарифів</caption>
        <thead><tr><th scope="col">Дата зміни</th><th scope="col">Діє з місяця</th><th scope="col">грн за кВт·год</th></tr></thead>
        <tbody>${entries
          .slice()
          .reverse()
          .map(
            ({ date, rate }) => `<tr>
          <td>${escape(formatCalendarDate(date))}</td>
          <td>${escape(periodLabel(date.slice(0, 7)))}</td>
          <td class="garage-table-value">${escape(tableAmount(rate))}</td>
        </tr>`,
          )
          .join("")}</tbody></table>`
      : "<p>Тарифів ще немає.</p>";
  }

  function save() {
    const date = parseCalendarDate(form.elements.date.value);
    const rate = parseAmount(form.elements.rate.value);
    if (!date) {
      error.textContent = "Введіть дату зміни тарифу у форматі ДД.ММ.РРРР.";
      form.elements.date.focus();
      return;
    }
    if (!rate) {
      error.textContent = "Введіть тариф у гривнях за кВт·год, наприклад 5,00.";
      form.elements.rate.focus();
      return;
    }
    try {
      const current = tariffHistory();
      if (!current.available) throw new Error("Tariffs unavailable");
      const entries = [...current.entries.filter((item) => item.date !== date), { date, rate }];
      entries.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem(storageKey, JSON.stringify(entries));
      update(entries);
    } catch {
      error.textContent = "Не вдалося зберегти тариф. Перевірте налаштування браузера.";
      return;
    }
    form.reset();
    error.textContent = "";
    status.textContent = `Тариф збережено. Діє з місяця: ${periodLabel(date.slice(0, 7))}.`;
  }

  form.querySelector("[data-save-tariff]").addEventListener("click", save);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && !event.isComposing) {
      event.preventDefault();
      save();
    }
  });
  form.addEventListener("input", () => {
    status.textContent = "";
    error.textContent = "";
  });
  update(history.entries);
}
