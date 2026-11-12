import { money, periodLabel, tableAmount } from "./contributions.js";
import { garageExamples } from "./garage-examples.js";

const dateLabel = (date) => date.split("-").reverse().join(".");

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
  const receipts = [
    ...example.contributions.map((item) => ({ ...item, purpose: "Членський внесок" })),
    ...example.electricity.map((item) => ({ ...item, purpose: "Електрика" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
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
    ${category("Внески", "<div data-garage-contributions></div>")}
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
}
