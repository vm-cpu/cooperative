import { garageExamples } from "./garage-examples.js";
import { garagePaymentHistory, money, periodLabel } from "./payment-data.js";

import { formatCalendarDate } from "./dates.js";
import { garageMeterHistory } from "./meter-readings.js";

export function garageCategory(name, body) {
  return `<details class="garage-category"><summary>${name}</summary><div class="garage-category-body">${body}</div></details>`;
}

export const garageElectricitySection = () =>
  garageCategory(
    "Світло",
    "<div data-electricity-meter-info><div data-meter-details></div></div><div data-garage-meter></div><div data-garage-electricity-payments></div>",
  );

export const garageReceiptsSection = () =>
  garageCategory("Квитанції", "<div data-garage-receipts></div>");

export function renderGarageOverview(host, garage, owner, escape) {
  const example = garageExamples.get(garage.id);
  const contributions = garagePaymentHistory("contributions", garage.id).entries[0];
  const light = garagePaymentHistory("electricity", garage.id).entries[0];
  const reading = garageMeterHistory(garage.id).entries[0];
  const paymentDate = (payment) => (payment ? formatCalendarDate(payment.date) : "Немає даних");
  const contacts = [
    ["Власник", owner],
    ...(garage.tenant ? [["Орендар", garage.tenant.person]] : []),
  ];
  host.innerHTML = `
    <section class="panel garage-overview" aria-label="Контакти гаража">
      ${contacts
        .map(([role, person]) => {
          const phone = person?.phone ?? "";
          const dial = phone.replace(/[^+0-9]/g, "");
          return `<div><p><strong>${role}</strong> · <span>${escape(person?.name ?? "Без власника")}</span></p>
          ${phone ? `<p>${escape(phone)} ${/^\+?\d+$/.test(dial) ? `<a class="button quiet" href="tel:${dial}" aria-label="Подзвонити · ${role.toLowerCase()}">Подзвонити</a>` : ""}</p>` : ""}</div>`;
        })
        .join("")}
    </section>
    <div class="garage-payment-overview">
      <section class="panel">
        <button type="button" data-open-garage-category="Внески">Переглянути внески</button>
        <dl><dt>Борг за внесками</dt><dd class="garage-balance">${example ? (example.debt ? escape(money(example.debt)) : "Боргу немає") : "Немає даних"}</dd>
        <dt>Оплачено до кінця місяця</dt><dd>${example?.paidThrough ? escape(periodLabel(example.paidThrough)) : "Немає даних"}</dd>
        <dt>Остання оплата</dt><dd>${paymentDate(contributions)}</dd></dl>
      </section>
      <section class="panel">
        <button type="button" data-open-garage-category="Світло">Переглянути світло</button>
        <dl><dt>Борг за світло</dt><dd class="garage-balance">Немає даних</dd>
        <dt>Остання оплата</dt><dd>${paymentDate(light)}</dd>
        <dt>Останній показник</dt><dd>${reading ? `${reading.value} кВт·год · ${formatCalendarDate(reading.date)}` : "Немає даних"}</dd></dl>
      </section>
    </div>`;
}
export function renderGarageExample(host) {
  host.innerHTML = `
    <div data-garage-overview></div>
    <div class="garage-categories">
      ${garageCategory("Власник і орендар", "<div data-garage-people></div>")}
      ${garageCategory("Внески", "<div data-garage-contributions></div>")}
      ${garageElectricitySection()}
      ${garageReceiptsSection()}
    </div>`;
}
