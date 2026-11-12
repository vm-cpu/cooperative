import { formatCalendarDate } from "./dates.js";
import { meterDetailsList } from "./meter-details.js";
import { filterGarages, garageLabel } from "./model.js";
import {
  garagePaymentHistory,
  garageReceiptHistory,
  money,
  periodLabel,
  receiptPurposes,
  tableAmount,
} from "./payment-data.js";
import { renderReceiptEditor } from "./receipt-editor.js";

function table(caption, headers, rows, escape) {
  return `<table class="garage-table"><caption>${escape(caption)}</caption>
    <thead><tr>${headers.map((value) => `<th scope="col">${escape(value)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((value, index) => `<td${["Дата", "Сума, грн"].includes(headers[index]) ? ' class="garage-table-value"' : ""}>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function renderGarageElectricityPayments(host, garage, escape) {
  const { entries, available } = garagePaymentHistory("electricity", garage.id);
  host.innerHTML =
    (available ? "" : '<p role="status">Частина збережених оплат недоступна.</p>') +
    (entries.length
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
      : "<p>Оплат за електрику ще немає.</p>");
}

export function renderGarageReceipts(host, garage, escape, canEdit, onSave) {
  host.innerHTML = "<div data-billing-editor></div><div data-billing-history></div>";
  const results = host.querySelector("[data-billing-history]");

  function update({ entries, available }) {
    results.innerHTML =
      (available ? "" : '<p role="status">Збережені квитанції недоступні.</p>') +
      receiptEntries(entries, garage, escape);
  }

  const initial = garageReceiptHistory(garage.id);
  update(initial);
  if (canEdit && initial.available) {
    renderReceiptEditor(host.querySelector("[data-billing-editor]"), garage.id, () => {
      update(garageReceiptHistory(garage.id));
      onSave();
    });
  }
}

function receiptEntries(entries, garage, escape) {
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
          (
            item,
          ) => `<details data-receipt="${escape(item.receipt)}"><summary>Відкрити квитанцію №${escape(item.receipt)}</summary>
        <dl><dt>Гараж</dt><dd>${escape(garageLabel(garage))}</dd><dt>За що</dt><dd>${escape(receiptPurposes[item.purpose])}</dd>
        <dt>За період</dt><dd>${escape(periodLabel(item.period))}</dd>
        <dt>Дата оплати</dt><dd>${escape(formatCalendarDate(item.date))}</dd><dt>Сума</dt><dd>${escape(money(item.amount))}</dd></dl>
        ${item.purpose === "electricity" ? meterDetailsList(item, escape) : ""}
        <p class="muted">Демонстраційна квитанція</p>
        <div class="receipt-actions"><button type="button" disabled>Надрукувати</button></div>
      </details>`,
        )
        .join("")}</div>`;
}

export function renderReceiptResults(host, data, query, receiptHref, escape) {
  let available = true;
  const records = filterGarages(data, { q: query }).flatMap((garage) => {
    const history = garageReceiptHistory(garage.id);
    available &&= history.available;
    return history.entries.map((receipt) => ({ garage, receipt }));
  });
  records.sort((a, b) => b.receipt.date.localeCompare(a.receipt.date));

  host.innerHTML = `
    ${available ? "" : '<p class="notice">Частина збережених квитанцій недоступна.</p>'}
    ${
      records.length
        ? `<table class="garage-table contribution-overview"><caption>Загальна таблиця квитанцій</caption>
        <thead><tr><th scope="col">Гараж і дата</th><th scope="col">За що і період</th><th scope="col">Сума, грн</th></tr></thead>
        <tbody>${records
          .map(
            ({ garage, receipt }) => `<tr>
          <th scope="row">${escape(garageLabel(garage))}
            <time datetime="${escape(receipt.date)}">${escape(formatCalendarDate(receipt.date))}</time></th>
          <td><strong>${escape(receiptPurposes[receipt.purpose])}</strong><div>${escape(periodLabel(receipt.period))}</div>
            <a class="contribution-garage-link" data-record="${escape(garage.id + "/" + receipt.receipt)}" href="${escape(receiptHref(garage.id, receipt.receipt))}"
              aria-label="Відкрити квитанцію №${escape(receipt.receipt)} гаража ${escape(garageLabel(garage))}">Відкрити квитанцію</a></td>
          <td class="garage-table-value">${escape(tableAmount(receipt.amount))}</td>
        </tr>`,
          )
          .join("")}</tbody></table>`
        : "<p>Квитанцій за цим пошуком немає.</p>"
    }`;
}
