const storageKey = (id) => `cooperative.demo.meter-details.v1.${id}`;

export function readMeterDetails(id) {
  try {
    const details = JSON.parse(localStorage.getItem(storageKey(id)) ?? "{}");
    return {
      meterNumber: typeof details?.meterNumber === "string" ? details.meterNumber : "",
      sealNumber: typeof details?.sealNumber === "string" ? details.sealNumber : "",
    };
  } catch {
    return null;
  }
}

export function meterDetailsList(details, escape) {
  return `<dl><dt>Номер лічильника</dt><dd>${escape(details?.meterNumber || "Не вказано")}</dd>
    <dt>Номер пломби лічильника</dt><dd>${escape(details?.sealNumber || "Не вказано")}</dd></dl>`;
}

export function renderMeterDetailsEditor(host, id, escape, onSave) {
  const initial = readMeterDetails(id);
  host.innerHTML = `
    <h2>Дані лічильника</h2>
    <div data-meter-details-list>${meterDetailsList(initial, escape)}</div>
    <details class="garage-form">
      <summary>Редагувати дані лічильника</summary>
      <form aria-label="Дані лічильника">
        <div class="garage-form-fields">
          <label>Номер лічильника<input name="meterNumber" value="${escape(initial?.meterNumber ?? "")}" type="text" maxlength="80" autocomplete="off"></label>
          <label>Номер пломби лічильника<input name="sealNumber" value="${escape(initial?.sealNumber ?? "")}" type="text" maxlength="80" autocomplete="off"></label>
        </div>
        <div class="garage-form-actions"><button type="button" data-save>Зберегти дані лічильника</button><button type="button" data-cancel>Скасувати</button></div>
        <p role="alert"></p>
      </form>
    </details>
    <p role="status">${initial ? "" : "Не вдалося прочитати збережені номери."}</p>`;
  const disclosure = host.querySelector("details");
  const form = host.querySelector("form");
  const error = form.querySelector("[role=alert]");
  const status = host.querySelector("[role=status]");

  function close() {
    disclosure.open = false;
    disclosure.querySelector("summary").focus();
  }

  function save(event) {
    event.preventDefault();
    const details = {
      meterNumber: form.elements.meterNumber.value.trim(),
      sealNumber: form.elements.sealNumber.value.trim(),
    };
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(details));
    } catch {
      error.textContent = "Не вдалося зберегти дані лічильника.";
      return;
    }
    host.querySelector("[data-meter-details-list]").innerHTML = meterDetailsList(details, escape);
    form.elements.meterNumber.defaultValue = details.meterNumber;
    form.elements.sealNumber.defaultValue = details.sealNumber;
    error.textContent = "";
    status.textContent = "Дані лічильника збережено.";
    close();
    onSave(details);
  }

  // The demo preview can block native form submission.
  form.querySelector("[data-save]").addEventListener("click", save);
  form.addEventListener("submit", save);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && !event.isComposing) {
      save(event);
    }
  });
  form.querySelector("[data-cancel]").addEventListener("click", () => {
    form.reset();
    error.textContent = "";
    close();
  });
}
