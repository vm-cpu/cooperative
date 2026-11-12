import { parseCalendarDate } from "./dates.js";
import { garageLabel } from "./model.js";
import {
  money,
  parseAmount,
  parsePeriod,
  receiptPurposes,
  saveGarageEntry,
} from "./payment-data.js";

export function renderPaymentEditor(
  host,
  { id, garages, summaryText, formLabel, kind = "contributions" },
  escape,
  onSave,
) {
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
  const receipt = kind === "receipts";
  const purposeField = receipt
    ? `<label>За що<select name="purpose" aria-label="За що" aria-required="true">
        <option value="">Виберіть вид оплати</option>
        ${Object.entries(receiptPurposes)
          .map(([value, label]) => `<option value="${value}">${label}</option>`)
          .join("")}
      </select></label>`
    : "";
  host.innerHTML = `
    <details class="garage-form">
      <summary>${summaryText ?? (garages ? "Додати оплату" : "Додати тестову оплату")}</summary>
      <form aria-label="${formLabel ?? "Тестова оплата членського внеску"}">
        <p class="muted">Дата у форматі ДД.ММ.РРРР. Період — один місяць (11.2026) або діапазон (11.2025 - 11.2026).</p>
        <div class="garage-form-fields">
          ${garageField}
          ${purposeField}
          <label>Дата оплати<input name="date" type="text" placeholder="12.11.2026" autocomplete="off" aria-required="true"></label>
          <label>Сума, грн<input name="amount" type="text" inputmode="decimal" placeholder="1500,00" autocomplete="off" aria-required="true"></label>
          <label>За період<input name="period" type="text" placeholder="11.2026" autocomplete="off" aria-required="true"></label>
        </div>
        <div class="garage-form-actions"><button type="button" data-save-payment>${receipt ? "Зберегти квитанцію" : "Зберегти оплату"}</button><button type="button" data-cancel-payment>Скасувати</button></div>
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
    const period = parsePeriod(values.get("period"));
    const amount = parseAmount(values.get("amount"));
    const purpose = values.get("purpose");
    if (receipt && !Object.hasOwn(receiptPurposes, purpose)) {
      error.textContent = "Виберіть, за що видано квитанцію.";
      editor.elements.purpose.focus();
      return;
    }
    if (!date) {
      error.textContent = "Введіть дійсну дату у форматі ДД.ММ.РРРР, наприклад 12.11.2026.";
      return;
    }
    if (!amount) {
      error.textContent = "Введіть суму від 0,01 до 1 000 000 грн, наприклад 1500,00.";
      return;
    }
    if (!period) {
      error.textContent =
        "Введіть місяць і рік (11.2026) або період від раннього до пізнього місяця (11.2025 - 11.2026).";
      return;
    }

    try {
      const entry = { date, amount, period };
      if (receipt) entry.purpose = purpose;
      saveGarageEntry(kind, garageId, entry);
    } catch {
      error.textContent = "Не вдалося зберегти запис. Перевірте налаштування браузера.";
      return;
    }
    closeForm();
    status.textContent = receipt
      ? "Квитанцію збережено в історії."
      : `Тестову оплату ${money(amount)} збережено в історії.`;
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
