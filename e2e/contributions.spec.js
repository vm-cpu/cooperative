import { test, expect } from "@playwright/test";
import { buildDemo } from "../scripts/build-demo.mjs";

test("the standalone preview saves a contribution and lists it with the other payments", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  const html = await buildDemo();
  await page.route("**/contribution-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<iframe title="Демо" style="width:100%;height:100vh;border:0" src="/contribution-demo" sandbox="allow-scripts allow-same-origin"></iframe>',
    }),
  );
  await page.route("**/contribution-demo", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/contribution-preview");
  const screen = page.frameLocator("iframe");
  const navigation = screen.getByRole("navigation");
  await navigation.getByRole("link", { name: "Внески", exact: true }).click();
  const overview = screen.getByRole("table", { name: "Загальна таблиця внесків" });
  await expect(overview.getByRole("link", { name: "1-2", exact: true }).first()).toBeVisible();
  await expect(overview.getByText("Вступний внесок").first()).toBeVisible();

  const search = screen.getByLabel("Гараж або власник", { exact: true });
  await search.fill("1-01");
  await expect(overview.getByRole("link", { name: "1-2", exact: true })).toHaveCount(0);
  await overview.getByRole("link", { name: "1-01", exact: true }).first().click();
  await screen
    .locator("#garage-example .garage-category > summary")
    .filter({ hasText: /^Внески$/ })
    .click();
  await screen.getByText("Додати тестову оплату", { exact: true }).click();

  const date = screen.getByLabel("Дата оплати", { exact: true });
  const period = screen.getByLabel("За місяць", { exact: true });
  const save = screen.getByRole("button", { name: "Зберегти оплату", exact: true });
  await date.pressSequentially("12.11.2026");
  await screen.getByLabel("Сума, грн", { exact: true }).pressSequentially("1500,25");
  await period.pressSequentially("13.2026");
  await save.click();
  await expect(screen.getByRole("alert")).toContainText("Введіть місяць і рік");
  await period.fill("11.2026");
  await save.click();
  await expect(screen.getByRole("status").filter({ hasText: "збережено в історії" })).toBeVisible();
  const history = screen.getByRole("table", { name: "Історія членських внесків" });
  await expect(history.getByRole("row", { name: /12.11.2026/ })).toContainText(/1\s500,25/);

  await screen.getByRole("link", { name: "Повернутися до внесків" }).click();
  await expect(search).toHaveValue("1-01");
  const newPayment = overview.getByRole("row", { name: /12.11.2026/ });
  await expect(newPayment).toContainText(/1\s500,25/);
  await expect(newPayment).toContainText("листопад 2026");
  await expect(screen.getByRole("status").filter({ hasText: "Разом:" })).toContainText(/3\s900,25/);
  await expect
    .poll(() => overview.evaluate((el) => el.ownerDocument.documentElement.scrollWidth))
    .toBeLessThanOrEqual(
      await overview.evaluate((el) => el.ownerDocument.documentElement.clientWidth),
    );
  await page.reload();
  await navigation.getByRole("link", { name: "Внески", exact: true }).click();
  await expect(newPayment).toContainText(/1\s500,25/);
});
