import { isReadingDate } from "./meter-readings.js";
import { garageExamples } from "./garage-examples.js";

const currency = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" });
const month = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric", timeZone: "UTC" });
const decimal = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const tableAmount = (amount) => decimal.format(amount / 100);
const money = (amount) => currency.format(amount / 100);
const dateLabel = (date) => date.split("-").reverse().join(".");
const periodLabel = (period) =>
  period
    .split(" – ")
    .map((value) => month.format(new Date(value + "-01T00:00:00Z")))
    .join(" – ");
const validMonth = (period) => /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && !period.startsWith("0000");
const maxPayment = 100000000;
const storageKey = (id) => `cooperative.demo.contributions.v1.${id}`;

function storedPayments(id) {
  const saved = JSON.parse(localStorage.getItem(storageKey(id)) ?? "[]");
  if (!Array.isArray(saved)) throw new Error("Invalid payments");
  return saved.filter(
    (item) =>
      item &&
      typeof item.date === "string" &&
      isReadingDate(item.date) &&
      typeof item.period === "string" &&
      validMonth(item.period) &&
      Number.isInteger(item.amount) &&
      item.amount > 0 &&
      item.amount <= maxPayment,
  );
}

function table(caption, headers, rows, escape) {
  return `<table class="garage-table"><caption>${escape(caption)}</caption>
    <thead><tr>${headers.map((value) => `<th scope="col">${escape(value)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((value, index) => `<td${["Дата", "Орендує з", "Сума, грн"].includes(headers[index]) ? ' class="garage-table-value"' : ""}>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function category(name, body) {
  return `<details class="garage-category"><summary>${name}</summary><div class="garage-category-body">${body}</div></details>`;
}

export function renderGarageExample(host, garage, owner, ownerUrl, label, escape) {
  const example = garageExamples.get(garage.id);
  const contributions = (saved) =>
    table(
      "Історія членських внесків",
      ["Дата", "Сума, грн", "За період"],
      [...saved.slice().reverse(), ...example.contributions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((item) => [dateLabel(item.date), tableAmount(item.amount), periodLabel(item.period)]),
      escape,
    );
  const receipts = [
    ...example.contributions.map((item) => ({ ...item, purpose: "Членський внесок" })),
    ...example.electricity.map((item) => ({ ...item, purpose: "Електрика" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  let saved = [];
  let storageUnavailable = false;
  try {
    saved = storedPayments(garage.id);
  } catch {
    storageUnavailable = true;
  }

  host.innerHTML = `
    <section class="panel garage-overview" aria-label="Коротко про гараж">
      <h2>${escape(owner.name)}</h2>
      <dl><dt>Оплачено до кінця місяця</dt><dd>${escape(periodLabel(example.paidThrough))}</dd>
      <dt>Борг за внесками</dt><dd>${example.debt ? escape(money(example.debt)) : "Немає"}</dd></dl>
    </section>
    <div class="garage-categories">
    ${category(
      "Власник і орендарі",
      `
      <h3>Власник</h3><dl><dt>ПІБ</dt><dd>${escape(owner.name)}</dd><dt>Телефон</dt><dd>${escape(example.phone)}</dd>
      <dt>Адреса</dt><dd>${escape(example.address)}</dd></dl>
      <a class="button quiet" href="${escape(ownerUrl)}">Відкрити картку власника</a>
      ${
        example.tenants.length
          ? table(
              "Орендарі",
              ["ПІБ і телефон", "Орендує з"],
              example.tenants.map((item) => [
                `${item.name} · ${item.phone}`,
                dateLabel(item.since),
              ]),
              escape,
            )
          : "<p>Орендарів немає.</p>"
      }
    `,
    )}
    ${category(
      "Внески",
      `
      <p><strong>Вступний внесок.</strong> Сплачено ${escape(money(example.entry.amount))} · ${escape(dateLabel(example.entry.date))}</p>
      <div data-contributions>${contributions(saved)}</div>
      <details class="garage-form"><summary>Додати тестову оплату</summary>
        <form aria-label="Тестова оплата внеску">
          <p class="muted">Запис зберігається в цьому браузері. Сума боргу й оплачений період наведені для прикладу.</p>
          <div class="garage-form-fields">
            <label>Дата оплати<input name="date" type="date" required></label>
            <label>Сума, грн<input name="amount" type="number" inputmode="decimal" min="0.01" max="1000000" step="0.01" required></label>
            <label>За місяць<input name="period" type="month" placeholder="РРРР-ММ" required></label>
          </div>
          <div class="garage-form-actions"><button type="submit">Зберегти оплату</button><button type="button" data-cancel>Скасувати</button></div>
          <p data-payment-error role="alert"></p>
        </form>
      </details>
      <p data-payment-status role="status">${storageUnavailable ? "Збережені оплати недоступні в цьому браузері." : ""}</p>
    `,
    )}
    ${category(
      "Електрика",
      `
      <div data-garage-meter></div>
      ${table(
        "Оплати за електрику",
        ["Дата", "Сума, грн", "За період"],
        example.electricity.map((item) => [
          dateLabel(item.date),
          tableAmount(item.amount),
          periodLabel(item.period),
        ]),
        escape,
      )}
    `,
    )}
    ${category(
      "Квитанції",
      `
      ${table(
        "Історія квитанцій",
        ["Дата", "Номер", "Сума, грн"],
        receipts.map((item) => [dateLabel(item.date), item.receipt, tableAmount(item.amount)]),
        escape,
      )}
      <div class="garage-receipts">${receipts
        .map(
          (item) => `<details><summary>Відкрити квитанцію №${escape(item.receipt)}</summary>
        <dl><dt>Гараж</dt><dd>${escape(label)}</dd><dt>За що</dt><dd>${escape(item.purpose)}</dd><dt>За період</dt><dd>${escape(periodLabel(item.period))}</dd>
        <dt>Дата оплати</dt><dd>${escape(dateLabel(item.date))}</dd><dt>Сума</dt><dd>${escape(money(item.amount))}</dd></dl><p class="muted">Демонстраційна квитанція</p>
      </details>`,
        )
        .join("")}</div>
    `,
    )}
    </div>`;

  const form = host.querySelector("form");
  const disclosure = host.querySelector(".garage-form");
  const summary = disclosure.querySelector("summary");
  const error = form.querySelector("[data-payment-error]");
  const status = host.querySelector("[data-payment-status]");
  function closeForm() {
    form.reset();
    error.textContent = "";
    disclosure.open = false;
    summary.focus();
  }
  form.querySelector("[data-cancel]").addEventListener("click", closeForm);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const date = values.get("date");
    const period = values.get("period");
    const amount = Math.round(Number(values.get("amount")) * 100);
    if (
      !isReadingDate(date) ||
      !validMonth(period) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > maxPayment
    ) {
      error.textContent = "Перевірте дату, суму та місяць у форматі РРРР-ММ.";
      return;
    }
    try {
      saved = [...storedPayments(garage.id), { date, amount, period }];
      localStorage.setItem(storageKey(garage.id), JSON.stringify(saved));
    } catch {
      error.textContent =
        "Не вдалося зберегти оплату. Перевірте, чи браузер дозволяє зберігання даних.";
      return;
    }
    host.querySelector("[data-contributions]").innerHTML = contributions(saved);
    closeForm();
    status.textContent = `Тестову оплату ${money(amount)} збережено в історії.`;
  });
}
