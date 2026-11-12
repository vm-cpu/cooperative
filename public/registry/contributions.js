import { garageExamples } from "./garage-examples.js";
import { formatCalendarDate, isCalendarDate, parseCalendarDate } from "./dates.js";
import { filterGarages, garageLabel } from "./model.js";

const currency = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" });
const month = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric", timeZone: "UTC" });
const decimal = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const tableAmount = (amount) => decimal.format(amount / 100);
export const money = (amount) => currency.format(amount / 100);
export const periodLabel = (period) =>
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
      isCalendarDate(item.date) &&
      typeof item.period === "string" &&
      validMonth(item.period) &&
      Number.isInteger(item.amount) &&
      item.amount > 0 &&
      item.amount <= maxPayment,
  );
}

function contributionHistory(id) {
  const examples = garageExamples.get(id)?.contributions ?? [];
  try {
    return {
      entries: [...storedPayments(id).reverse(), ...examples].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
      available: true,
    };
  } catch {
    return {
      entries: examples.slice().sort((a, b) => b.date.localeCompare(a.date)),
      available: false,
    };
  }
}

function cardTable(entries, escape) {
  if (!entries.length) return "<p>Членських внесків ще немає.</p>";
  return `<table class="garage-table"><caption>Історія членських внесків</caption>
    <thead><tr><th scope="col">Дата</th><th scope="col">Сума, грн</th><th scope="col">За період</th></tr></thead>
    <tbody>${entries
      .map(
        ({ date, amount, period }) => `<tr>
      <td class="garage-table-value">${escape(formatCalendarDate(date))}</td>
      <td class="garage-table-value">${escape(tableAmount(amount))}</td>
      <td>${escape(periodLabel(period))}</td>
    </tr>`,
      )
      .join("")}</tbody></table>`;
}

export function renderPaymentEditor(host, { id, garages, example }, escape, onSave) {
  if (garages && !garages.length) {
    host.innerHTML = "<p>Немає гаражів, для яких можна додати оплату.</p>";
    return;
  }
  const garageField = garages
    ? `<label>Гараж<select name="garage" aria-label="Гараж" aria-required="true">
        <option value="">Виберіть гараж</option>
        ${garages.map((garage) => `<option value="${escape(garage.id)}">${escape(garageLabel(garage))}</option>`).join("")}
      </select></label>`
    : "";
  host.innerHTML = `
    <details class="garage-form">
      <summary>${garages ? "Додати оплату" : "Додати тестову оплату"}</summary>
      <form aria-label="Тестова оплата членського внеску">
        <p class="muted">Дата у форматі ДД.ММ.РРРР, місяць у форматі ММ.РРРР. Тестова оплата зберігається в браузері.${example ? " Борг і оплачений період наведені для прикладу." : ""}</p>
        <div class="garage-form-fields">
          ${garageField}
          <label>Дата оплати<input name="date" type="text" placeholder="12.11.2026" autocomplete="off" aria-required="true"></label>
          <label>Сума, грн<input name="amount" type="text" inputmode="decimal" placeholder="1500,00" autocomplete="off" aria-required="true"></label>
          <label>За місяць<input name="period" type="text" placeholder="11.2026" autocomplete="off" aria-required="true"></label>
        </div>
        <div class="garage-form-actions"><button type="button" data-save-payment>Зберегти оплату</button><button type="button" data-cancel-payment>Скасувати</button></div>
        <p data-payment-error role="alert"></p>
      </form>
    </details>
    <p data-payment-status role="status"></p>`;
  const editor = host.querySelector("form");
  const disclosure = host.querySelector(".garage-form");
  const summary = disclosure.querySelector("summary");
  const error = editor.querySelector("[data-payment-error]");
  const status = host.querySelector("[data-payment-status]");
  function closeForm() {
    editor.reset();
    error.textContent = "";
    disclosure.open = false;
    summary.focus();
  }
  editor.querySelector("[data-cancel-payment]").addEventListener("click", closeForm);
  editor.addEventListener("input", () => {
    error.textContent = "";
  });

  function save() {
    const values = new FormData(editor);
    const garageId = id ?? values.get("garage");
    if (garages && !garages.some((garage) => garage.id === garageId)) {
      error.textContent = "Виберіть гараж, для якого додаєте оплату.";
      editor.elements.garage.focus({ preventScroll: true });
      return;
    }
    const date = parseCalendarDate(values.get("date"));
    const monthParts = /^(\d{2})\.(\d{4})$/.exec(values.get("period").trim());
    const period = monthParts ? `${monthParts[2]}-${monthParts[1]}` : "";
    const amountParts = /^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(values.get("amount").trim());
    const amount = amountParts
      ? Number(amountParts[1]) * 100 + Number((amountParts[2] ?? "").padEnd(2, "0"))
      : 0;
    if (!date) {
      error.textContent = "Введіть дійсну дату у форматі ДД.ММ.РРРР, наприклад 12.11.2026.";
      return;
    }
    if (amount < 1 || amount > maxPayment) {
      error.textContent = "Введіть суму від 0,01 до 1 000 000 грн, наприклад 1500,00.";
      return;
    }
    if (!validMonth(period)) {
      error.textContent = "Введіть місяць і рік у форматі ММ.РРРР, наприклад 11.2026.";
      return;
    }

    try {
      const payments = [...storedPayments(garageId), { date, amount, period }];
      localStorage.setItem(storageKey(garageId), JSON.stringify(payments));
    } catch {
      error.textContent = "Не вдалося зберегти оплату. Перевірте налаштування браузера.";
      return;
    }
    closeForm();
    status.textContent = `Тестову оплату ${money(amount)} збережено в історії.`;
    onSave(garageId);
  }

  // The demo preview may block native submission while allowing button clicks.
  editor.querySelector("[data-save-payment]").addEventListener("click", save);
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && !event.isComposing) {
      event.preventDefault();
      save();
    }
  });
}

export function renderGarageContributions(host, id, escape, canEdit) {
  const history = contributionHistory(id);
  const entry = garageExamples.get(id)?.entry;
  host.innerHTML = `
    ${entry ? `<p><strong>Вступний внесок.</strong> Сплачено ${escape(money(entry.amount))} · ${escape(formatCalendarDate(entry.date))}</p>` : ""}
    <div data-payment-editor></div>
    ${history.available ? "" : '<p role="status">Збережені оплати недоступні в цьому браузері.</p>'}
    <div data-contributions>${cardTable(history.entries, escape)}</div>`;
  if (canEdit && history.available) {
    renderPaymentEditor(
      host.querySelector("[data-payment-editor]"),
      { id, example: Boolean(entry) },
      escape,
      () => {
        host.querySelector("[data-contributions]").innerHTML = cardTable(
          contributionHistory(id).entries,
          escape,
        );
      },
    );
  }
}

export function renderContributionResults(host, data, query, garageHref, escape) {
  let available = true;
  const payments = filterGarages(data, { q: query }).flatMap((garage) => {
    const history = contributionHistory(garage.id);
    available &&= history.available;
    const entry = garageExamples.get(garage.id)?.entry;
    return [...history.entries, ...(entry ? [entry] : [])].map((payment) => ({ garage, payment }));
  });
  payments.sort((a, b) => b.payment.date.localeCompare(a.payment.date));
  const total = payments.reduce((sum, { payment }) => sum + payment.amount, 0);
  host.innerHTML = `
    ${available ? "" : '<p class="notice">Частина оплат, збережених у браузері, недоступна.</p>'}
    <p class="muted" role="status">Записів: ${payments.length} · Разом: ${escape(money(total))}</p>
    ${
      payments.length
        ? `<table class="garage-table contribution-overview"><caption>Загальна таблиця внесків</caption>
      <thead><tr><th scope="col">Гараж і дата</th><th scope="col">За що</th><th scope="col">Сума, грн</th></tr></thead>
      <tbody>${payments
        .map(
          ({ garage, payment }) => `<tr>
        <th scope="row"><a class="contribution-garage-link" data-record="${escape(garage.id)}" href="${escape(garageHref(garage.id))}">${escape(garageLabel(garage))}</a>
          <time datetime="${escape(payment.date)}">${escape(formatCalendarDate(payment.date))}</time></th>
        <td>${payment.period ? escape(periodLabel(payment.period)) : "Вступний внесок"}</td>
        <td class="garage-table-value">${escape(tableAmount(payment.amount))}</td>
      </tr>`,
        )
        .join("")}</tbody></table>`
        : "<p>Внесків за цим пошуком немає.</p>"
    }`;
}
