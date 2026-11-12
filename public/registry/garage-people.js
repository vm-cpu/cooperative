import { formatCalendarDate, parseCalendarDate } from "./dates.js";
import { garageExamples } from "./garage-examples.js";
import { garageLabel } from "./model.js";

export function prepareGaragePeople(data) {
  data.people = new Map(data.ownerById);
  for (const garage of data.garages) {
    const example = garageExamples.get(garage.id);
    if (!example) continue;
    const owner = data.ownerById.get(garage.ownerId);
    if (owner) {
      owner.phone = example.phone;
      owner.address = example.address;
    }
    if (example.tenant) {
      const { since, ...contact } = example.tenant;
      const person = { ...contact, id: `demo-tenant-${garage.id}` };
      data.people.set(person.id, person);
      garage.tenant = { person, since };
    }
  }
}

function updateGaragePerson(data, garage, role, person, since) {
  // People stay in the directory. Only this garage's selected role changes.
  if (role === "owner") {
    if (person && !data.ownerById.has(person.id)) {
      data.owners.push(person);
      data.ownerById.set(person.id, person);
    }
    garage.ownerId = person?.id ?? null;
    garage.ownerSince = since;
  } else {
    garage.tenant = person ? { person, since } : null;
  }
}

const roles = {
  owner: { title: "Власник", empty: "Без власника", object: "власника", since: "Власник з" },
  tenant: { title: "Орендар", empty: "Без орендаря", object: "орендаря", since: "Орендар з" },
};

export function renderGaragePeople(host, data, garage, ownerHref, escape, onChange) {
  host.className = "garage-people";
  for (const [role, words] of Object.entries(roles)) {
    const section = document.createElement("section");
    section.setAttribute("aria-label", words.title);
    section.innerHTML = `<h3>${words.title}</h3><div data-person-content></div><p class="form-message" role="status"></p>`;
    host.append(section);
    const content = section.querySelector("[data-person-content]");
    const status = section.querySelector("[role=status]");
    const current = () =>
      role === "owner" ? data.ownerById.get(garage.ownerId) : garage.tenant?.person;

    function showPerson(message = "", focus = false) {
      const person = current();
      const since = role === "owner" ? garage.ownerSince : garage.tenant?.since;
      content.innerHTML = person
        ? `<dl><dt>ПІБ</dt><dd>${escape(person.name)}</dd>
          ${person.phone ? `<dt>Телефон</dt><dd>${escape(person.phone)}</dd>` : ""}
          ${person.address ? `<dt>Адреса</dt><dd>${escape(person.address)}</dd>` : ""}
          ${since ? `<dt>${words.since}</dt><dd><time datetime="${escape(since)}">${escape(formatCalendarDate(since))}</time></dd>` : ""}
          </dl>
          ${role === "owner" ? `<a class="button quiet" href="${escape(ownerHref(person.id))}">Відкрити картку власника</a>` : ""}
          <div class="garage-form-actions"><button type="button" data-edit-person>Замінити</button><button type="button" data-remove-person>Прибрати</button></div>`
        : `<p>${words.empty}</p><div class="garage-form-actions"><button type="button" data-edit-person>Додати</button></div>`;
      const edit = content.querySelector("[data-edit-person]");
      edit.addEventListener("click", showEditor);
      content.querySelector("[data-remove-person]")?.addEventListener("click", confirmRemoval);
      status.textContent = message;
      if (focus) edit.focus();
    }

    function save(person, since, message) {
      updateGaragePerson(data, garage, role, person, since);
      showPerson(message, true);
      onChange();
    }

    function confirmRemoval() {
      status.textContent = "";
      content.innerHTML = `<p>Прибрати ${words.object} ${escape(current().name)} з гаража ${escape(garageLabel(garage))}?</p>
        <div class="garage-form-actions"><button type="button" data-cancel>Скасувати</button><button type="button" data-confirm>Так, прибрати</button></div>`;
      const cancel = content.querySelector("[data-cancel]");
      cancel.addEventListener("click", () => showPerson("", true));
      content
        .querySelector("[data-confirm]")
        .addEventListener("click", () => save(null, null, "Зв’язок із гаражем прибрано."));
      cancel.focus();
    }

    function showEditor() {
      status.textContent = "";
      const previous = current();
      const people = [...data.people.values()]
        .filter((person) => person !== previous)
        .sort((a, b) => a.name.localeCompare(b.name, "uk"));
      const options = people.map((person) => {
        const sameName = people.some((other) => other !== person && other.name === person.name);
        const label = sameName ? `${person.name} (${person.id})` : person.name;
        return `<option value="${escape(person.id)}">${escape(label)}</option>`;
      });
      content.innerHTML = `<div class="garage-form-fields"><label>Людина<select name="person"><option value="">Виберіть людину</option><option value="new">Нова людина</option>${options.join("")}</select></label></div>
        <div class="garage-form-fields" data-new-person hidden>
          <label>ПІБ<input name="name" maxlength="120" required /></label>
          <label>Телефон (необов’язково)<input name="phone" type="tel" maxlength="40" /></label>
        </div>
        <div class="garage-form-fields"><label>${words.since}<input name="since" type="text" placeholder="01.11.2026" autocomplete="off" aria-describedby="${role}-since-hint" /></label></div>
        <p id="${role}-since-hint" class="muted">Дата у форматі ДД.ММ.РРРР. Якщо вона невідома, залиште поле порожнім.</p>
        <div class="garage-form-actions"><button type="button" data-save>Зберегти</button><button type="button" data-cancel>Скасувати</button></div>`;
      const select = content.querySelector("select");
      const newFields = content.querySelector("[data-new-person]");
      const name = content.querySelector("[name=name]");
      const date = content.querySelector("[name=since]");
      function saveSelection() {
        const dateText = date.value.trim();
        const since = parseCalendarDate(dateText);
        if (dateText && !since) {
          status.textContent = "Введіть дійсну дату у форматі ДД.ММ.РРРР, наприклад 01.11.2026.";
          date.setAttribute("aria-invalid", "true");
          date.focus();
          return;
        }
        let person = data.people.get(select.value);
        if (select.value === "new") {
          if (!name.value.trim()) {
            status.textContent = "Введіть ПІБ.";
            name.focus();
            return;
          }
          const id = `demo-person-${data.people.size + 1}`;
          person = {
            id,
            name: name.value.trim(),
            phone: content.querySelector("[name=phone]").value.trim(),
          };
          data.people.set(id, person);
        }
        if (!person) {
          status.textContent = "Виберіть людину або додайте нову.";
          select.focus();
          return;
        }
        save(person, since, previous ? "Заміну збережено." : "Людину додано до гаража.");
      }
      select.addEventListener("change", () => {
        newFields.hidden = select.value !== "new";
        if (!date.hasAttribute("aria-invalid")) status.textContent = "";
        if (!newFields.hidden) name.focus();
      });
      date.addEventListener("input", () => {
        if (date.hasAttribute("aria-invalid")) {
          date.removeAttribute("aria-invalid");
          status.textContent = "";
        }
      });
      for (const input of content.querySelectorAll("input")) {
        input.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.isComposing) return;
          event.preventDefault();
          saveSelection();
        });
      }
      content.querySelector("[data-save]").addEventListener("click", saveSelection);
      content.querySelector("[data-cancel]").addEventListener("click", () => showPerson("", true));
      select.focus();
    }

    showPerson();
  }
}
