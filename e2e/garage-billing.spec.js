import { expect, test } from "@playwright/test";
import { buildDemo } from "../scripts/build-demo.mjs";

test("demo calculates monthly electricity charges and saves garage payments and receipts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  const html = await buildDemo();
  await page.route("**/billing-demo", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/billing-demo#electricity");
  await page.getByText("Тарифи на електрику", { exact: true }).click();
  const tariffForm = page.getByRole("form", { name: "Тариф на електрику" });
  async function addTariff(date, rate) {
    await tariffForm.getByLabel("Дата зміни тарифу").fill(date);
    await tariffForm.getByLabel("Тариф, грн за кВт·год").fill(rate);
    await tariffForm.getByRole("button", { name: "Зберегти тариф" }).click();
    await expect(tariffForm.getByRole("status")).toContainText("Тариф збережено");
  }
  await addTariff("01.10.2026", "4,00");
  await addTariff("15.11.2026", "5,00");
  await expect(page.getByRole("table", { name: "Історія тарифів" })).toContainText("листопад 2026");

  await page.goto("/billing-demo#garage/garage-01");
  const category = (name) => page.locator(".garage-category > summary").filter({ hasText: name });
  await category("Електрика").click();
  const readings = page.getByRole("table", { name: "Показники лічильника" });
  const october = readings.getByRole("row", { name: /01\.11\.2026/ });
  await expect(october).toContainText("жовтень 2026");
  await expect(october.getByRole("cell").last()).toHaveText("72,00");

  await page.getByRole("button", { name: "Внести показники" }).click();
  await page.getByLabel("Дата зняття показників").fill("01.12.2026");
  await page.getByLabel("Новий показник, кВт·год").fill("1274");
  await page.getByRole("button", { name: "Зберегти показники" }).click();
  const november = readings.getByRole("row", { name: /01\.12\.2026/ });
  await expect(november).toContainText("листопад 2026");
  await expect(november.getByRole("cell").last()).toHaveText("100,00");

  const payments = page.getByRole("table", { name: "Оплати за електрику" });
  const recorded = payments.getByRole("row", { name: /02\.12\.2026/ });
  await expect(recorded).toHaveCount(0);
  await expect(page.getByText("Внести оплату", { exact: true })).toHaveCount(0);

  await page.getByText("Редагувати дані лічильника", { exact: true }).click();
  const meterForm = page.getByRole("form", { name: "Дані лічильника" });
  await meterForm.getByLabel("Номер лічильника", { exact: true }).fill("00123-М");
  await meterForm.getByLabel("Номер пломби лічильника").fill("007-П");
  await meterForm.getByRole("button", { name: "Зберегти дані лічильника" }).click();
  await expect(page.locator("[data-electricity-meter-info]")).toContainText("00123-М");
  await expect(page.locator("[data-electricity-meter-info]")).toContainText("007-П");

  await category("Квитанції").click();
  await page.getByText("Відкрити квитанцію №Е-001").click();
  await expect(page.getByRole("button", { name: "Надрукувати" })).toBeDisabled();
  await page.getByText("Відкрити квитанцію №Е-001").click();
  await expect(page.getByRole("button", { name: "Надрукувати" })).toHaveCount(0);
  await page.getByText("Створити квитанцію", { exact: true }).click();
  const receipt = page.getByRole("form", { name: "Нова квитанція" });
  await receipt.getByLabel("За що").selectOption("electricity");
  await receipt.getByLabel("Дата оплати").fill("02.12.2026");
  await receipt.getByLabel("Сума, грн").fill("172");
  await receipt.getByLabel("За період").fill("10.2026 - 11.2026");
  await receipt.getByRole("button", { name: "Зберегти квитанцію" }).click();
  const receipts = page.getByRole("table", { name: "Історія квитанцій" });
  await expect(receipts.getByRole("columnheader", { name: "За що" })).toBeVisible();
  await expect(receipts.getByRole("row", { name: /ДЕМО-001/ })).toContainText("Електрика");

  await expect(recorded).toHaveCount(1);
  await expect(recorded).toContainText("172,00");
  await expect(recorded).toContainText("жовтень 2026 р. – листопад 2026 р.");
  const navigation = page.getByRole("navigation");
  await navigation.getByRole("link", { name: "Квитанції", exact: true }).click();
  const overview = page.getByRole("table", { name: "Загальна таблиця квитанцій" });
  await page.getByRole("searchbox").fill("1-01");
  const link = overview.getByRole("link", { name: "Відкрити квитанцію №ДЕМО-001 гаража 1-01" });
  await link.click();
  await expect(page.getByText("Відкрити квитанцію №ДЕМО-001", { exact: true })).toBeFocused();
  await page.reload();
  const newReceipt = page.locator(".garage-receipts details[open]");
  await expect(newReceipt).toContainText("00123-М");
  await expect(newReceipt).toContainText("007-П");
  await expect(page.locator("[data-meter-details-list]")).toContainText("00123-М");
  await expect(newReceipt).toContainText("жовтень 2026 р. – листопад 2026 р.");
  await expect(newReceipt.getByRole("button", { name: "Надрукувати" })).toBeDisabled();
  await category("Електрика").click();
  await expect(recorded).toHaveCount(1);
  await expect(november.getByRole("cell").last()).toHaveText("100,00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await page.getByRole("link", { name: "Повернутися до квитанцій" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("1-01");
  await page.goto("/billing-demo#electricity?row=1");
  const row = page
    .getByRole("table", { name: "Останні показники" })
    .getByRole("row", { name: /1-01/ });
  await expect(row).toContainText("00123-М");
  await expect(row).toContainText("007-П");

  await page.goto("/billing-demo#garage/garage-02");
  await category("Електрика").click();
  await expect(
    readings
      .getByRole("row", { name: /01\.11\.2026/ })
      .getByRole("cell")
      .last(),
  ).toHaveText("28,00");
  await expect(recorded).toHaveCount(0);
});
