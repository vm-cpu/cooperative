import { parseCalendarDate } from "./dates.js";
import { readMeterDetails } from "./meter-details.js";
import { parseAmount, parsePeriod, receiptPurposes, saveGarageReceipt } from "./payment-data.js";

export function renderReceiptEditor(host, id, onSave) {
  const purposes = Object.entries(receiptPurposes)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  host.innerHTML = `
    <details class="garage-form">
      <summary>Створити квитанцію</summary>
      <form aria-label="Нова квитанція">
        <p class="muted">Дата у форматі ДД.ММ.РРРР. Період — один місяць (11.2026) або діапазон (11.2025 - 11.2026).</p>
        <div class="garage-form-fields">
          <label>За що<select name="purpose" aria-label="За що" aria-required="true">
            <option value="">Виберіть вид оплати</option>${purposes}
          </select></label>
          <label>Дата оплати<input name="date" type="text" placeholder="12.11.2026" autocomplete="off" aria-required="true"></label>
          <label>Сума, грн<input name="amount" type="text" inputmode="decimal" placeholder="1500,00" autocomplete="off" aria-required="true"></label>
          <label>За період<input name="period" type="text" placeholder="11.2026" autocomplete="off" aria-required="true"></label>
        </div>
        <div class="garage-form-actions"><button type="button" data-save-payment>Зберегти квитанцію</button><button type="button" data-cancel-payment>Скасувати</button></div>
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
    const date = parseCalendarDate(values.get("date"));
    const period = parsePeriod(values.get("period"));
    const amount = parseAmount(values.get("amount"));
    const purpose = values.get("purpose");
    if (!Object.hasOwn(receiptPurposes, purpose)) {
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
      const meter = purpose === "electricity" ? readMeterDetails(id) : null;
      saveGarageReceipt(id, { date, amount, period, purpose, ...meter });
    } catch {
      error.textContent = "Не вдалося зберегти запис. Перевірте налаштування браузера.";
      return;
    }
    closeForm();
    status.textContent = "Квитанцію збережено в історії.";
    onSave();
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
