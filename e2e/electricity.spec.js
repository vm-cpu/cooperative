import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("saves a row together, restores its position and updates garage history on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Електрика" }).click();
  const row = page
    .locator("#electricity-rows details")
    .filter({ has: page.getByText("Ряд 1", { exact: true }) });
  await row.locator("summary").click();
  await expect(page).toHaveURL(/#electricity\?row=1$/);
  const overview = row.getByRole("table", { name: "Останні показники" });
  await expect(overview.getByRole("row", { name: /1-01/ })).toContainText("01.11.2026");
  await expect(overview.getByRole("row", { name: /1-11/ })).toContainText("—");

  await row.getByRole("button", { name: "Внести показники" }).click();
  const date = row.getByLabel("Дата зняття показників");
  await date.fill("2026-11-12");
  await row.getByLabel("Новий показник гаража 1-01", { exact: true }).fill("1272");
  const second = row.getByLabel("Новий показник гаража 1-2", { exact: true });
  await second.fill("500");
  const save = row.getByRole("button", { name: "Зберегти показники" });
  await save.click();
  await expect(row.getByRole("alert")).toContainText("новий показник менший");
  await expect(second).toBeFocused();
  await expect(row.getByLabel("Новий показник гаража 1-01", { exact: true })).toHaveValue("1272");
  expect(
    await page.evaluate(() => localStorage.getItem("cooperative.demo.meter-readings.v1")),
  ).toBeNull();

  await second.fill("593");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: "test-results/electricity-entry-phone.png", fullPage: true });
  await save.click();
  await expect(row.getByRole("status")).toContainText("Збережено показників: 2");
  await expect(overview.getByRole("row", { name: /1-2/ })).toContainText("593");
  await expect(overview.getByRole("row", { name: /1-10/ })).toContainText("02.11.2026");

  await row.getByRole("link", { name: "1-01", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Гараж 1-01" })).toBeVisible();
  await page
    .locator("#garage-example summary")
    .filter({ hasText: /^Електрика$/ })
    .click();
  const readings = page.getByRole("table", { name: "Показники лічильника" });
  await expect(readings.getByRole("row", { name: /12.11.2026/ })).toContainText(/1\s272/);
  await expect(readings.getByRole("row", { name: /01.11.2026/ })).toBeVisible();

  await page.getByRole("link", { name: "Повернутися до ряду" }).click();
  await expect(row).toHaveAttribute("open", "");
  await expect(row.getByRole("link", { name: "1-01", exact: true })).toBeFocused();
  await page.reload();
  await expect(overview.getByRole("row", { name: /1-01/ })).toContainText("12.11.2026");
  await row.getByRole("button", { name: "Внести показники" }).click();
  await date.fill("2026-11-12");
  await row.getByLabel("Новий показник гаража 1-01", { exact: true }).fill("1273");
  await save.click();
  await expect(row.getByRole("alert")).toContainText("виберіть дату після 12.11.2026");
  await row.getByRole("button", { name: "Скасувати" }).click();
  await expect(overview.getByRole("row", { name: /1-01/ })).toContainText(/1\s272/);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "test-results/electricity-overview-desktop.png", fullPage: true });
});
