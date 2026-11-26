const button = document.querySelector("#text-size");
function applySize(large) {
  document.documentElement.classList.toggle("large-text", large);
  button.setAttribute("aria-pressed", String(large));
  button.textContent = large ? "Звичайний текст" : "Збільшити текст";
}
try {
  applySize(localStorage.getItem("cooperative-large-text") === "true");
} catch {
  applySize(false);
}
button.addEventListener("click", () => {
  const large = button.getAttribute("aria-pressed") !== "true";
  applySize(large);
  try {
    localStorage.setItem("cooperative-large-text", String(large));
  } catch {
    /* Optional preference only; no registry data is stored. */
  }
});
