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
          return `<div class="garage-contact">
            <div>
              <p class="garage-contact-role">${role}</p>
              <p class="garage-contact-name">${escape(person?.name ?? "Без власника")}</p>
              ${phone ? `<p class="garage-contact-phone">${escape(phone)}</p>` : ""}
            </div>
            ${/^\+?\d+$/.test(dial) ? `<a class="button garage-call" href="tel:${dial}" aria-label="Подзвонити · ${role.toLowerCase()}">Подзвонити</a>` : ""}
          </div>`;
        })
        .join("")}
    </section>
    <div class="garage-payment-overview">
      <section class="panel garage-payment-card" aria-labelledby="garage-dues-heading">
        <h2 id="garage-dues-heading">Внески</h2>
        <dl><dt>Борг за внесками</dt><dd class="garage-balance${example?.debt ? " garage-balance-due" : ""}">${example ? (example.debt ? escape(money(example.debt)) : "Боргу немає") : "Немає даних"}</dd>
        <dt>Оплачено до кінця місяця</dt><dd>${example?.paidThrough ? escape(periodLabel(example.paidThrough)) : "Немає даних"}</dd>
        <dt>Остання оплата</dt><dd>${paymentDate(contributions)}</dd></dl>
        <button type="button" data-open-garage-category="Внески">Переглянути внески</button>
      </section>
      <section class="panel garage-payment-card" aria-labelledby="garage-light-heading">
        <h2 id="garage-light-heading">Світло</h2>
        <dl><dt>Борг за світло</dt><dd class="garage-balance garage-balance-unknown">Немає даних</dd>
        <dt>Остання оплата</dt><dd>${paymentDate(light)}</dd>
        <dt>Останній показник</dt><dd>${reading ? `${reading.value} кВт·год · ${formatCalendarDate(reading.date)}` : "Немає даних"}</dd></dl>
        <button type="button" data-open-garage-category="Світло">Переглянути світло</button>
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
