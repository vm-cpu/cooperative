import { parseCalendarDate } from "./dates.js";
import { createGaragePerson, setGarageOwner } from "./garage-people.js";
import { filterGarages, garageLabel, isConfirmedGarage, qualityIssues } from "./model.js";

export function renderOwnerEditor(host, data, escape, onSave) {
  host.innerHTML = `
    <button type="button" aria-expanded="false" aria-controls="owner-editor-panel">Додати нового власника</button>
    <div id="owner-editor-panel" class="panel detail-section" hidden></div>
    <p data-owner-status role="status"></p>`;
  const toggle = host.querySelector("button");
  const panel = host.querySelector("#owner-editor-panel");
  const status = host.querySelector("[data-owner-status]");

  function close() {
    panel.hidden = true;
    panel.replaceChildren();
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }

  function open() {
    const issues = qualityIssues(data);
    const garages = filterGarages(data, { missing: true }).filter((garage) =>
      isConfirmedGarage(garage, issues),
    );
    status.textContent = "";
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (!garages.length) {
      panel.innerHTML = '<p tabindex="-1">Немає гаражів без власника з підтвердженим номером.</p>';
      panel.firstElementChild.focus();
      return;
    }
    panel.innerHTML = `
      <h2 id="owner-editor-title">Новий власник</h2>
      <form aria-labelledby="owner-editor-title">
        <div class="garage-form-fields">
          <label>Прізвище, ім’я та по батькові<input name="name" type="text" maxlength="120" autocomplete="off" required /></label>
          <label>Гараж<select name="garage" aria-label="Гараж" aria-describedby="owner-garage-hint" required>
            <option value="">Виберіть гараж</option>
            ${garages.map((garage) => `<option value="${escape(garage.id)}">${escape(garageLabel(garage))}</option>`).join("")}
          </select></label>
        </div>
        <p id="owner-garage-hint" class="hint">У списку гаражі без власника з підтвердженим номером.</p>
        <div class="garage-form-fields">
          <label>Член кооперативу з<input name="memberSince" type="text" placeholder="01.11.2026" autocomplete="off" aria-describedby="owner-dates-hint" required /></label>
          <label>Власник гаража з<input name="ownerSince" type="text" placeholder="03.11.2026" autocomplete="off" aria-describedby="owner-dates-hint" required /></label>
        </div>
        <p id="owner-dates-hint" class="hint">Формат дат — ДД.ММ.РРРР. Дати можуть відрізнятися.</p>
        <p data-owner-error role="alert"></p>
        <div class="garage-form-actions"><button type="button" data-save-owner>Зберегти</button><button type="button" data-cancel-owner>Скасувати</button></div>
      </form>`;
    const form = panel.querySelector("form");
    const fields = form.elements;
    const error = form.querySelector("[data-owner-error]");
    function invalid(field, message) {
      error.textContent = message;
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }

    function save() {
      const name = fields.name.value.trim().replace(/\s+/g, " ");
      const garage = garages.find((item) => item.id === fields.garage.value);
      const memberSince = parseCalendarDate(fields.memberSince.value);
      const ownerSince = parseCalendarDate(fields.ownerSince.value);
      if (!name) return invalid(fields.name, "Введіть прізвище, ім’я та по батькові.");
      if (!garage || garage.ownerId) return invalid(fields.garage, "Виберіть гараж без власника.");
      if (!memberSince)
        return invalid(fields.memberSince, "Введіть дійсну дату вступу, наприклад 01.11.2026.");
      if (!ownerSince)
        return invalid(
          fields.ownerSince,
          "Введіть дійсну дату початку володіння, наприклад 03.11.2026.",
        );

      const owner = createGaragePerson(data, { name, memberSince });
      setGarageOwner(data, garage, owner, ownerSince);
      close();
      onSave(owner);
      status.textContent = `${owner.name} — додано власника гаража ${garageLabel(garage)}.`;
    }

    form.addEventListener("input", (event) => {
      if (!event.target.hasAttribute("aria-invalid")) return;
      event.target.removeAttribute("aria-invalid");
      error.textContent = "";
    });
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing || !(event.target instanceof HTMLInputElement))
        return;
      event.preventDefault();
      save();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      save();
    });
    form.querySelector("[data-save-owner]").addEventListener("click", save);
    form.querySelector("[data-cancel-owner]").addEventListener("click", close);
    fields.name.focus();
  }

  toggle.addEventListener("click", () => (panel.hidden ? open() : close()));
}
