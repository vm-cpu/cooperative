import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { garageExamples } from "../public/registry/garage-examples.js";

test("five garages have complete examples and other cards stay unchanged", async ({ page }) => {
  expect(garageExamples.size).toBe(5);
  for (const id of garageExamples.keys()) {
    await page.goto(`/#garage/${id}`);
    await expect(page.locator(".garage-category > summary")).toHaveText([
      "Власник і орендарі",
      "Внески",
      "Електрика",
      "Квитанції",
    ]);
  }
  await page.goto("/#garage/garage-04");
  await expect(page.getByRole("heading", { name: "Про гараж" })).toBeVisible();
  await expect(page.locator(".garage-category")).toHaveCount(0);
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
  for (const name of ["Власник і орендарі", "Внески", "Електрика", "Квитанції"]) {
    await card.getByText(name, { exact: true }).click();
  }
  await card.getByText("Відкрити квитанцію №Е-001", { exact: true }).click();
  await expect(card.locator(".garage-receipts details[open]")).toContainText(
    "Демонстраційна квитанція",
  );
  await card.getByText("Додати тестову оплату", { exact: true }).click();
  await page.getByLabel("Дата оплати").fill("2026-11-10");
  await page.getByLabel("Сума, грн").fill("123.45");
  await page.getByLabel("За місяць").fill("2027-04");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Зберегти оплату" }).click();
  await expect(card.getByRole("status")).toContainText("збережено в історії");
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
});
