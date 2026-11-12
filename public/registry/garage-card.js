import { garageExamples } from "./garage-examples.js";
import { money, periodLabel } from "./payment-data.js";

export function garageCategory(name, body) {
  return `<details class="garage-category"><summary>${name}</summary><div class="garage-category-body">${body}</div></details>`;
}

export const garageElectricitySection = () =>
  garageCategory(
    "Електрика",
    "<div data-garage-meter></div><div data-garage-electricity-payments></div>",
  );

export const garageReceiptsSection = () =>
  garageCategory("Квитанції", "<div data-garage-receipts></div>");

export function renderGarageExample(host, garage, owner, escape) {
  const example = garageExamples.get(garage.id);
  host.innerHTML = `
    <section class="panel garage-overview" aria-label="Коротко про гараж">
      <h2 data-garage-owner-name>${escape(owner?.name ?? "Без власника")}</h2>
      <dl><dt>Оплачено до кінця місяця</dt><dd>${escape(periodLabel(example.paidThrough))}</dd>
      <dt>Борг за внесками</dt><dd>${example.debt ? escape(money(example.debt)) : "Немає"}</dd></dl>
    </section>
    <div class="garage-categories">
      ${garageCategory("Власник і орендар", "<div data-garage-people></div>")}
      ${garageCategory("Внески", "<div data-garage-contributions></div>")}
      ${garageElectricitySection()}
      ${garageReceiptsSection()}
    </div>`;
}
