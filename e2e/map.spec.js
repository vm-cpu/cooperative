import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("map and list retain query, uniquely matched garage opens and returns to map", async ({
  page,
}) => {
  await page.goto("/#garages?q=1-01&mode=list");
  await page.getByRole("link", { name: "Карта", exact: true }).click();
  await expect(page.locator(".map-viewport")).toBeVisible();
  await expect(page.locator("#search")).toHaveValue("1-01");
  const world = page.locator(".map-viewport svg > g");
  await page.getByRole("button", { name: "Збільшити", exact: true }).click();
  const cameraBefore = await world.getAttribute("transform");
  const cell = page.getByRole("button", { name: "Гараж 1-1", exact: true });
  await cell.click();
  await expect(page.locator("h1")).toHaveText("Гараж 1-01");
  await page.getByRole("link", { name: "Повернутися до мапи" }).click();
  await expect(world).toHaveAttribute("transform", cameraBefore);
  await expect(page.locator(".map-viewport")).toBeVisible();
  await page.getByRole("link", { name: "Список", exact: true }).click();
  await expect(page.locator("#search")).toHaveValue("1-01");
});

test("rotation keeps labels level, reset faces entrance, unknowns have no invented card", async ({
  page,
}) => {
  await page.goto("/#garages?mode=map");
  const label = page.locator(".map-cell text").first();
  await expect(label).toHaveAttribute("transform", /^rotate\(0 /);
  await page.getByRole("button", { name: "Праворуч ↷", exact: true }).click();
  await expect(label).toHaveAttribute("transform", /^rotate\(-90 /);
  const matrix = await label.evaluate((el) => {
    const m = el.getCTM();
    return { b: m.b, c: m.c };
  });
  expect(Math.abs(matrix.b)).toBeLessThan(0.001);
  expect(Math.abs(matrix.c)).toBeLessThan(0.001);
  await page.reload();
  await expect(label).toHaveAttribute("transform", /^rotate\(-90 /);
  await page.getByRole("button", { name: "Початковий вигляд", exact: true }).click();
  await expect(label).toHaveAttribute("transform", /^rotate\(0 /);
  const unknown = page.locator(".map-cell.uncertain").first();
  await unknown.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Номер уточнюється");
  await page.getByRole("link", { name: "Повернутися до мапи" }).click();
  await expect(page.locator(".map-landmark text").filter({ hasText: /^Яма$/ })).toHaveCount(4);
  await page.locator(".map-cell").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".map-cell").nth(1)).toBeFocused();
});

for (const width of [320, 375, 768, 1280])
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
    // All shapes must fit at overview in every orientation, with level text.
    const viewport = page.locator(".map-viewport");
    for (let rotation = 0; rotation < 4; rotation++) {
      const issues = await viewport.evaluate((host) => {
        const bounds = host.getBoundingClientRect();
        return [...host.querySelectorAll("polygon, .map-landmark rect, text")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left < bounds.left ||
              r.right > bounds.right ||
              r.top < bounds.top ||
              r.bottom > bounds.bottom
            );
          })
          .map((el) => el.parentElement.dataset.cell || el.textContent);
      });
      expect(issues).toEqual([]);
      await viewport.scrollIntoViewIfNeeded();
      // Let SVG repaint after the screenshot helper scrolls the page to the map.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await viewport.screenshot({ path: `test-results/plan-${width}-${rotation}.png` });
      expect(await viewport.evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
      const clipped = await viewport.evaluate((host) => {
        const bounds = host.getBoundingClientRect();
        return [...host.querySelectorAll("polygon, .map-landmark rect")].some((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.top < bounds.top ||
            r.bottom > bounds.bottom ||
            r.left < bounds.left ||
            r.right > bounds.right
          );
        });
      });
      expect(clipped).toBe(false);
      await page.getByRole("button", { name: "Праворуч ↷", exact: true }).click();
    }
    await page.locator(".map-controls").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/map-${width}.png`, fullPage: true });
  });

test("map zoom and rotation preserve a searched garage at the center; drag and reset work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/#garages?mode=map&q=1-01");
  const viewport = page.locator(".map-viewport");
  const cell = page.getByRole("button", { name: "Гараж 1-1", exact: true });
  const centered = async () => {
    const a = await viewport.boundingBox(),
      b = await cell.boundingBox();
    expect(Math.abs(a.x + a.width / 2 - b.x - b.width / 2)).toBeLessThan(2);
    expect(Math.abs(a.y + a.height / 2 - b.y - b.height / 2)).toBeLessThan(2);
  };
  await centered();
  await page.getByRole("button", { name: "Збільшити", exact: true }).click();
  await centered();
  await page.getByRole("button", { name: "Праворуч ↷", exact: true }).click();
  await centered();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect
    .poll(async () => Math.round((await viewport.boundingBox()).width))
    .toBeGreaterThan(500);
  await centered();
  await viewport.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      viewport.evaluate((el) => el.querySelector("svg").viewBox.baseVal.width === el.clientWidth),
    )
    .toBe(true);
  const before = await cell.boundingBox(),
    area = await viewport.boundingBox();
  await viewport.evaluate((element) => {
    const label = element.querySelector(".map-cell text");
    const observer = new MutationObserver(() => {
      element.dataset.labelMoved = "true";
    });
    observer.observe(label, { attributes: true, attributeFilter: ["transform"] });
  });
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + area.width / 2 + 50, area.y + area.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  const after = await cell.boundingBox();
  expect(await viewport.evaluate((el) => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
  expect(after.x - before.x).toBeCloseTo(50, 0);
  expect(after.y - before.y).toBeCloseTo(30, 0);
  expect(await viewport.getAttribute("data-label-moved")).toBeNull();
  await page.getByRole("button", { name: "Початковий вигляд", exact: true }).click();
  await expect(page.locator(".map-cell text").first()).toHaveAttribute("transform", /^rotate\(0 /);
});

test("a row page opens the shared garage card and restores its part", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await page.goto("/#garages?mode=map");
  await page.getByRole("link", { name: "Ряд 4", exact: true }).click();
  await page.getByRole("link", { name: "Наступна" }).click();
  const slot = page.getByRole("link", { name: "Гараж 4-45", exact: true });
  await slot.click();
  await expect(page.locator("h1")).toHaveText("Гараж 4-45");
  await expect(page.locator("summary").filter({ hasText: "Квитанції" })).toBeVisible();
  await page.getByRole("link", { name: "Повернутися до ряду" }).click();
  await expect(page.getByRole("heading", { name: /Ряд 4 · Частина 2/ })).toBeVisible();
  await expect(slot).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
  await page.getByRole("link", { name: "До карти" }).click();
  await page.getByRole("searchbox").fill("Прикладенко");
  await page.getByRole("link", { name: "Гараж 1-10", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Гараж 1-10");
  await page.getByRole("link", { name: "Повернутися до мапи" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Прикладенко");
});
