import { garageExamples } from "./garage-examples.js";
import { formatCalendarDate } from "./dates.js";
import { filterGarages, garageLabel } from "./model.js";
import { garageEntryHistory, money, periodLabel, tableAmount } from "./payment-data.js";
import { renderPaymentEditor } from "./payment-editor.js";

function contributionHistory(id) {
  return garageEntryHistory("contributions", id, garageExamples.get(id)?.contributions ?? []);
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

export function renderGarageContributions(host, id, escape, canEdit) {
  const history = contributionHistory(id);
  const entry = garageExamples.get(id)?.entry;
  host.innerHTML = `
    ${entry ? `<p><strong>Вступний внесок.</strong> Сплачено ${escape(money(entry.amount))} · ${escape(formatCalendarDate(entry.date))}</p>` : ""}
    <div data-payment-editor></div>
    ${history.available ? "" : '<p role="status">Збережені оплати недоступні в цьому браузері.</p>'}
    <div data-contributions>${cardTable(history.entries, escape)}</div>`;
  if (canEdit && history.available) {
    renderPaymentEditor(host.querySelector("[data-payment-editor]"), { id }, escape, () => {
      host.querySelector("[data-contributions]").innerHTML = cardTable(
        contributionHistory(id).entries,
        escape,
      );
    });
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
