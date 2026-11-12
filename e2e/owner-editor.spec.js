import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildDemo } from "../scripts/build-demo.mjs";

test("adding a member in the owners list links a garage and keeps both dates distinct", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  const html = await buildDemo();
  await page.route("**/owner-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="uk"><head><title>Попередній перегляд</title></head><body><iframe title="Демо" sandbox="allow-scripts allow-same-origin" width="350" height="720" src="/owner-document#owners?multiple=true"></iframe></body></html>',
    }),
  );
  await page.route("**/owner-document", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/owner-preview");
  const demo = page.frameLocator("iframe");
  const add = demo.getByRole("button", { name: "Додати нового власника" });
  const form = demo.getByRole("form", { name: "Новий власник" });
  const name = form.getByLabel("Прізвище, ім’я та по батькові");
  const garage = form.getByLabel("Гараж", { exact: true });
  const memberSince = form.getByLabel("Член кооперативу з");
  const ownerSince = form.getByLabel("Власник гаража з");
  const newName = "Навчальний Дмитро Сергійович";

  await add.click();
  await expect(name).toBeFocused();
  await name.fill(newName);
  await form.getByRole("button", { name: "Скасувати" }).click();
  await expect(form).toBeHidden();
  await expect(add).toBeFocused();
  await add.click();
  await expect(name).toHaveValue("");
  await expect(garage.locator('option[value="garage-01"]')).toHaveCount(0);
  await expect(garage.locator('option[value="garage-04"]')).toHaveText("1-11");
  await expect(
    form.evaluate((node) => {
      const doc = node.ownerDocument;
      return doc.documentElement.scrollWidth <= doc.defaultView.innerWidth;
    }),
  ).resolves.toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);

  await name.fill(newName);
  await garage.selectOption("garage-04");
  await memberSince.fill("31.11.2026");
  await ownerSince.fill("03.11.2026");
  await form.getByRole("button", { name: "Зберегти" }).click();
  await expect(form.getByRole("alert")).toContainText("дійсну дату вступу");
  await expect(memberSince).toBeFocused();
  await expect(demo.getByRole("link", { name: newName, exact: true })).toHaveCount(0);
  await memberSince.fill("01.11.2026");
  await memberSince.press("Enter");

  await expect(form).toBeHidden();
  await expect(demo.getByLabel("Кілька гаражів")).not.toBeChecked();
  const ownerLink = demo.getByRole("link", { name: newName, exact: true });
  await expect(ownerLink).toBeVisible();
  await expect(demo.locator("#results time")).toHaveText("01.11.2026");
  await ownerLink.click();
  await expect(demo.locator("time")).toHaveText("01.11.2026");
  await demo.getByRole("link", { name: "Гараж 1-11", exact: true }).click();
  await demo.getByText("Власник і орендар", { exact: true }).click();
  const owner = demo.getByRole("region", { name: "Власник", exact: true });
  await expect(owner).toContainText(newName);
  await expect(owner.locator("time")).toHaveText("03.11.2026");
});
