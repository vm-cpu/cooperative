const theme = document.querySelector("#theme");
function applyTheme(value) {
  if (value === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = value;
}
try {
  const saved = localStorage.getItem("cooperative-theme");
  if (["light", "dark", "system"].includes(saved)) theme.value = saved;
} catch {
  /* Browsing with storage disabled still supports theme changes. */
}
applyTheme(theme.value);
theme.addEventListener("change", () => {
  applyTheme(theme.value);
  try {
    localStorage.setItem("cooperative-theme", theme.value);
  } catch {
    /* Optional preference storage. */
  }
});
