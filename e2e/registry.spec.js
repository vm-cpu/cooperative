import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 375, 768, 1280])
  test(`registry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Гаражі", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/registry-${width}.png`, fullPage: true });
    await page.getByLabel("Номер гаража або ім’я людини").fill("1-01");
    await page.getByRole("link", { name: "Відкрити картку гаража 1-01", exact: true }).click();
    await page.getByText("Власник і орендар", { exact: true }).click();
    await page.getByRole("link", { name: "Відкрити картку власника", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Гаражі власника" })).toBeVisible();
    await page.locator(".record-link").filter({ hasNotText: "Гараж 1-01" }).first().click();
    await expect(page.getByRole("heading", { name: "Гараж 1-2", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Повернутися до списку" }).click();
    await expect(page.getByLabel("Номер гаража або ім’я людини")).toHaveValue("1-01");
    await page.reload();
    await expect(page.getByLabel("Номер гаража або ім’я людини")).toHaveValue("1-01");
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
  await page.getByLabel("Номер гаража або ім’я людини").fill("нічого-немає");
  await expect(page.getByRole("heading", { name: "Нічого не знайдено" })).toBeVisible();
});

for (const target of ["list", "card"]) {
  test(`skip link preserves ${target} and filters`, async ({ page }) => {
    await page.goto("/#garages?q=1-01&row=1");
    await expect(page.locator("#search")).toHaveValue("1-01");
    if (target === "card") {
      await page.getByRole("link", { name: "Відкрити картку гаража 1-01", exact: true }).click();
      await expect(page.locator("h1")).toHaveText("Гараж 1-01");
    }
    const before = page.url();
    const heading = await page.locator("h1").textContent();
    await page.locator(".skip").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
    await expect(page).toHaveURL(before);
    await expect(page.locator("h1")).toHaveText(heading);
    await expect
      .poll(() =>
        page.locator("#main").evaluate((el) => {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const maximum = document.documentElement.scrollHeight - window.innerHeight;
          return Math.abs(window.scrollY - Math.min(top, maximum));
        }),
      )
      .toBeLessThan(2);
    if (target === "card") await page.getByRole("link", { name: "Повернутися до списку" }).click();
    await expect(page.locator("#search")).toHaveValue("1-01");
    await expect(page.locator("#row")).toHaveValue("1");
  });
}

test("raw HTML owner name stays text in list and card", async ({ page }) => {
  const name = '<img src=x onerror="window.xssExecuted=true;alert(1)">';
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.route("**/registry/demo.json", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.owners[0].source.name = name;
    await route.fulfill({ response, json: data });
  });
  await page.goto("/#owners");
  const link = page.locator(".record-link").filter({ hasText: name });
  await expect(link).toHaveText(name);
  await expect(page.locator("#results img")).toHaveCount(0);
  await link.click();
  await expect(page.locator("h1")).toHaveText(name);
  await expect(page.locator("#screen img")).toHaveCount(0);
  expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
  expect(dialogs).toBe(0);
});

for (const width of [320, 375, 768]) {
  for (const large of [false, true]) {
    test(`mobile filters ${width}px large=${large}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/");
      if (large) await page.getByRole("button", { name: "Збільшити текст" }).click();
      await expect(page.locator("#search")).toBeVisible();
      if (width === 375) {
        const box = await page.locator("#search").boundingBox();
        expect(box.y + box.height).toBeLessThan(812);
      }
      await page.getByLabel("Ряд", { exact: true }).selectOption("3");
      await page.getByLabel("Без власника", { exact: true }).check();
      await expect(page.locator(".record")).not.toHaveCount(0);
      for (const record of await page.locator(".record").all()) {
        await expect(record).toContainText("Ряд 3");
        await expect(record).toContainText("Власника не вказано");
      }
      await page.reload();
      await expect(page.locator("#row")).toHaveValue("3");
      await expect(page.getByLabel("Без власника", { exact: true })).toBeChecked();
      await page.getByRole("button", { name: "Скинути фільтри" }).click();
      await expect(page.locator("#search")).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/mobile-${width}-${large ? "large" : "normal"}.png`,
        fullPage: true,
      });
    });
  }
}

for (const width of [375, 1280]) {
  test(`directory and section search stay available while scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/#garages");
    const directory = page.locator(".directory-panel");
    const nav = directory.getByRole("navigation");
    const search = directory.getByRole("searchbox");
    await expect(page.locator("main").getByRole("searchbox")).toHaveCount(0);
    await expect(search).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    await expect(search).toBeInViewport({ ratio: 1 });
    await expect(nav.getByRole("link", { name: "Квитанції" })).toBeInViewport({ ratio: 1 });
    await search.fill("1-01");
    const result = page.getByRole("link", { name: "Гараж 1-01", exact: true });
    await expect(result).toBeInViewport({ ratio: 1 });
    await expect(search).toBeFocused();
    if (width === 375) {
      const panel = await directory.boundingBox();
      const record = await result.boundingBox();
      expect(record.y).toBeGreaterThanOrEqual(panel.y + panel.height - 1);
    }

    await nav.getByRole("link", { name: "Квитанції" }).click();
    await expect(search).toHaveAccessibleName("Гараж або власник");
    await search.fill("1-01");
    await expect(page.getByRole("table", { name: "Загальна таблиця квитанцій" })).toContainText(
      "1-01",
    );
    await nav.getByRole("link", { name: "Власники" }).click();
    await expect(search).toHaveAccessibleName("Ім’я власника");
    await nav.getByRole("link", { name: "Внески" }).click();
    await expect(search).toHaveAccessibleName("Гараж або власник");
    await nav.getByRole("link", { name: "Електрика" }).click();
    await expect(search).toHaveCount(0);
  });
}
