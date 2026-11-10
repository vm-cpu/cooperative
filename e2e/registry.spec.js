import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 375, 768, 1280])
  test(`registry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Гаражі", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/registry-${width}.png`, fullPage: true });
    await page.getByLabel("Номер гаража або ім’я власника").fill("1-01");
    await page.getByRole("link", { name: "Відкрити картку гаража 1-01", exact: true }).click();
    await page.getByRole("link", { name: "Відкрити картку власника", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Гаражі власника" })).toBeVisible();
    await page.getByRole("link", { name: "Повернутися до списку" }).click();
    await expect(page.getByLabel("Номер гаража або ім’я власника")).toHaveValue("1-01");
    await page.reload();
    await expect(page.getByLabel("Номер гаража або ім’я власника")).toHaveValue("1-01");
    await page.getByRole("button", { name: "Скинути фільтри" }).click();
    for (const view of ["Гаражі", "Власники", "Ряди", "Якість даних"]) {
      await page.getByRole("navigation").getByRole("link", { name: view, exact: true }).click();
      await expect(page.getByRole("heading", { name: view, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
    }
  });
test("empty result and recovery from load failure", async ({ page }) => {
  await page.route("**/registry/demo.json", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Не вдалося відкрити довідник" })).toBeVisible();
  await page.unroute("**/registry/demo.json");
  await page.getByRole("button", { name: "Спробувати ще раз" }).click();
  await page.getByLabel("Номер гаража або ім’я власника").fill("нічого-немає");
  await expect(page.getByRole("heading", { name: "Нічого не знайдено" })).toBeVisible();
});
