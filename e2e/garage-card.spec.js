import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { garageExamples } from "../public/registry/garage-examples.js";

test("five garages have complete examples and basic cards accept contributions and readings", async ({
  page,
}) => {
  expect(garageExamples.size).toBe(5);
  for (const id of garageExamples.keys()) {
    await page.goto(`/#garage/${id}`);
    await expect(page.locator(".garage-category > summary")).toHaveText([
      "Власник і орендар",
      "Внески",
      "Електрика",
      "Квитанції",
    ]);
  }
  await page.goto("/#garage/garage-04");
  await expect(page.getByRole("heading", { name: "Про гараж" })).toBeVisible();
  const categories = page.locator(".garage-category > summary");
  await expect(categories).toHaveText(["Власник і орендар", "Внески", "Електрика", "Квитанції"]);
  await categories.filter({ hasText: "Електрика" }).click();
  await expect(page.getByText("Показників лічильника ще немає.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Внести показники" })).toBeVisible();
});

test("mobile card tables, receipt and local contribution payment", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await page.goto("/#garages");
  const search = page.getByRole("searchbox");
  await search.fill("Тестова");
  await page.getByLabel("Ряд", { exact: true }).selectOption("1");
  await page.getByRole("link", { name: "Відкрити картку гаража 1-01" }).click();

  const card = page.locator("#garage-example");
  await expect(card.getByText("березень 2027 р.", { exact: true })).toBeVisible();
  await expect(card.locator("table").first()).toBeHidden();
  for (const name of ["Власник і орендар", "Внески", "Електрика", "Квитанції"]) {
    await card.locator(".garage-category > summary").filter({ hasText: name }).click();
  }
  await card.getByText("Відкрити квитанцію №Е-001", { exact: true }).click();
  await expect(card.locator(".garage-receipts details[open]")).toContainText(
    "Демонстраційна квитанція",
  );
  await card.getByText("Створити квитанцію", { exact: true }).click();
  const form = card.getByRole("form", { name: "Нова квитанція" });
  await form.getByLabel("За що", { exact: true }).selectOption("contributions");
  await form.getByLabel("Дата оплати").fill("10.11.2026");
  await form.getByLabel("Сума, грн").fill("123.45");
  await form.getByLabel("За період").fill("04.2027");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await form.getByRole("button", { name: "Зберегти квитанцію" }).click();
  await expect(card.getByRole("status").filter({ hasText: "Квитанцію збережено" })).toBeVisible();
  await expect(card.getByRole("table", { name: "Історія членських внесків" })).toContainText(
    "123,45",
  );
  await page.getByRole("link", { name: "Повернутися до списку" }).click();
  await expect(search).toHaveValue("Тестова");
  await expect(page.getByLabel("Ряд", { exact: true })).toHaveValue("1");
  await page.getByRole("link", { name: "Відкрити картку гаража 1-2", exact: true }).click();
  await card.getByText("Внески", { exact: true }).click();
  await expect(card.getByRole("table", { name: "Історія членських внесків" })).not.toContainText(
    "123,45",
  );
  await page.goto("/#garage/garage-01");
  await page.reload();
  await card.getByText("Внески", { exact: true }).click();
  await expect(card.getByRole("table", { name: "Історія членських внесків" })).toContainText(
    "123,45",
  );
  for (const name of ["Власник і орендар", "Електрика", "Квитанції"]) {
    await card.locator(".garage-category > summary").filter({ hasText: name }).click();
  }
  await page.screenshot({ path: "test-results/garage-card-phone.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "test-results/garage-card-desktop.png", fullPage: true });
});
