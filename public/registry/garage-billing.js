import { formatCalendarDate } from "./dates.js";
import { garageExamples } from "./garage-examples.js";
import { garageLabel } from "./model.js";
import {
  garageEntryHistory,
  money,
  periodLabel,
  receiptPurposes,
  tableAmount,
} from "./payment-data.js";
import { renderPaymentEditor } from "./payment-editor.js";

function table(caption, headers, rows, escape) {
  return `<table class="garage-table"><caption>${escape(caption)}</caption>
    <thead><tr>${headers.map((value) => `<th scope="col">${escape(value)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((value, index) => `<td${["Дата", "Сума, грн"].includes(headers[index]) ? ' class="garage-table-value"' : ""}>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderHistory(host, garage, escape, canEdit, options, examples, renderEntries) {
  const id = garage.id;
  const history = () => garageEntryHistory(options.kind, id, examples);
  const initial = history();
  host.innerHTML = `<div data-billing-editor></div><div data-billing-history></div>`;
  const results = host.querySelector("[data-billing-history]");
  function update({ entries, available }) {
    results.innerHTML =
      (available ? "" : '<p role="status">Записи, збережені в браузері, недоступні.</p>') +
      renderEntries(entries);
  }
  update(initial);
  if (canEdit && initial.available) {
    renderPaymentEditor(
      host.querySelector("[data-billing-editor]"),
      { id, ...options },
      escape,
      () => update(history()),
    );
  }
}

export function renderGarageElectricityPayments(host, garage, escape, canEdit) {
  const options = {
    kind: "electricity",
    summaryText: "Внести оплату",
    formLabel: "Оплата за електрику",
  };
  const examples = garageExamples.get(garage.id)?.electricity ?? [];
  renderHistory(host, garage, escape, canEdit, options, examples, (entries) =>
    entries.length
      ? table(
          "Оплати за електрику",
          ["Дата", "Сума, грн", "За період"],
          entries.map(({ date, amount, period }) => [
            formatCalendarDate(date),
            tableAmount(amount),
            periodLabel(period),
          ]),
          escape,
        )
      : "<p>Оплат за електрику ще немає.</p>",
  );
}

export function renderGarageReceipts(host, garage, escape, canEdit) {
  const example = garageExamples.get(garage.id);
  const examples = [
    ...(example?.contributions ?? []).map((item) => ({ ...item, purpose: "contributions" })),
    ...(example?.electricity ?? []).map((item) => ({ ...item, purpose: "electricity" })),
  ];
  const options = {
    kind: "receipts",
    summaryText: "Створити квитанцію",
    formLabel: "Нова квитанція",
  };
  renderHistory(host, garage, escape, canEdit, options, examples, (entries) => {
    if (!entries.length) return "<p>Квитанцій ще немає.</p>";
    return `
      ${table(
        "Історія квитанцій",
        ["Дата", "Номер", "За що", "Сума, грн"],
        entries.map((item) => [
          formatCalendarDate(item.date),
          item.receipt,
          receiptPurposes[item.purpose],
          tableAmount(item.amount),
        ]),
        escape,
      )}
      <div class="garage-receipts">${entries
        .map(
          (item) => `<details><summary>Відкрити квитанцію №${escape(item.receipt)}</summary>
        <dl><dt>Гараж</dt><dd>${escape(garageLabel(garage))}</dd><dt>За що</dt><dd>${escape(receiptPurposes[item.purpose])}</dd>
        <dt>За період</dt><dd>${escape(periodLabel(item.period))}</dd>
        <dt>Дата оплати</dt><dd>${escape(formatCalendarDate(item.date))}</dd><dt>Сума</dt><dd>${escape(money(item.amount))}</dd></dl>
        <p class="muted">Демонстраційна квитанція</p>
        <div class="receipt-actions"><button type="button" disabled>Надрукувати</button></div>
      </details>`,
        )
        .join("")}</div>`;
  });
}
