import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("map and list retain query, uniquely matched garage opens and returns to map", async ({
  page,
}) => {
  await page.goto("/#garages?q=1-01&mode=list");
  await page.getByRole("link", { name: "Карта", exact: true }).click();
  await expect(page.locator(".map-viewport")).toBeVisible();
  await expect(page.locator("#search")).toHaveValue("1-01");
  const cell = page.getByRole("button", { name: "Гараж 1-1", exact: true });
  await cell.click();
  await page
    .locator(".map-selection")
    .getByRole("link", { name: "Відкрити картку гаража" })
    .click();
  await expect(page.locator("h1")).toHaveText("Гараж 1-01");
  await page.getByRole("link", { name: "Повернутися до списку" }).click();
  await expect(page.locator(".map-viewport")).toBeVisible();
  await page.getByRole("link", { name: "Список", exact: true }).click();
  await expect(page.locator("#search")).toHaveValue("1-01");
});

test("rotation keeps labels level, reset faces entrance, unknowns have no invented card", async ({
  page,
}) => {
  await page.goto("/#garages?mode=map");
  const label = page.locator(".map-cell text").first();
  await expect(label).toHaveAttribute("transform", /^rotate\(20 /);
  await page.getByRole("button", { name: "Праворуч ↷", exact: true }).click();
  await expect(label).toHaveAttribute("transform", /^rotate\(-70 /);
  const matrix = await label.evaluate((el) => {
    const m = el.getCTM();
    return { b: m.b, c: m.c };
  });
  expect(Math.abs(matrix.b)).toBeLessThan(0.001);
  expect(Math.abs(matrix.c)).toBeLessThan(0.001);
  await page.reload();
  await expect(label).toHaveAttribute("transform", /^rotate\(-70 /);
  await page.getByRole("button", { name: "Початковий вигляд", exact: true }).click();
  await expect(label).toHaveAttribute("transform", /^rotate\(-340 /);
  const unknown = page.locator(".map-cell.uncertain").first();
  await unknown.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".map-selection")).toContainText("Номер уточнюється");
  await expect(page.locator(".map-selection a")).toHaveCount(0);
  await expect(page.locator(".map-landmark text").filter({ hasText: /^Яма$/ })).toHaveCount(4);
  await page.locator(".map-cell").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".map-cell").nth(1)).toBeFocused();
});

for (const width of [375, 1280])
  test(`map layout and accessibility ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#garages?mode=map");
    await expect(page.locator(".map-cell").first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.locator(".map-controls").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/map-${width}.png` });
  });
