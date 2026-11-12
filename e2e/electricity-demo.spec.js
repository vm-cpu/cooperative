import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { buildDemo } from "../scripts/build-demo.mjs";

let html;
test.beforeAll(async () => {
  html = await buildDemo();
});

async function saveSingleReading(screen, checkInvalid = false) {
  await screen.getByText("Ряд 1", { exact: true }).click();
  await screen.getByRole("button", { name: "Внести показники" }).click();
  await screen.getByLabel("Дата зняття показників").pressSequentially("12.11.2026");
  const reading = screen.getByLabel("Новий показник гаража 1-01", { exact: true });
  const save = screen.getByRole("button", { name: "Зберегти показники" });
  if (checkInvalid) {
    await reading.pressSequentially("1272.5");
    await save.click();
    await expect(screen.getByRole("alert")).toContainText("введіть ціле число");
    await reading.fill("");
  }
  await reading.pressSequentially("1272");
  await save.click();
  await expect(
    screen.getByRole("status").filter({ hasText: "Збережено показників: 1" }),
  ).toBeVisible();
  const garage = screen.getByRole("row", { name: /1-01/ });
  await expect(garage).toContainText(/1\s272/);
  await expect(garage).toContainText("12.11.2026");
  await expect(screen.getByRole("row", { name: /1-2/ })).toContainText("587");
}

async function saveFromGarageCard(screen, withEnter) {
  await screen.getByRole("link", { name: "1-01", exact: true }).click();
  const electricity = screen.locator("#garage-example summary").filter({ hasText: /^Електрика$/ });
  await electricity.click();
  const readings = screen.getByRole("table", { name: "Показники лічильника" });
  await expect(readings.getByRole("row", { name: /12.11.2026/ })).toContainText(/1\s272/);
  await screen.getByRole("button", { name: "Внести показники" }).click();
  await screen.getByLabel("Дата зняття показників").pressSequentially("13.11.2026");
  const reading = screen.getByLabel("Новий показник, кВт·год", { exact: true });
  await reading.pressSequentially("1280");
  if (withEnter) await reading.press("Enter");
  else await screen.getByRole("button", { name: "Зберегти показники" }).click();

  await expect(
    screen.getByRole("status").filter({ hasText: "Збережено показників: 1" }),
  ).toBeVisible();
  await expect(readings.getByRole("row", { name: /13.11.2026/ })).toContainText(/1\s280/);
  await expect(readings.getByRole("row", { name: /12.11.2026/ })).toContainText(/1\s272/);
  await screen.getByRole("link", { name: "Повернутися до ряду" }).click();
  const garage = screen.getByRole("row", { name: /1-01/ });
  await expect(garage).toContainText(/1\s280/);
  await expect(garage).toContainText("13.11.2026");
  await expect(screen.getByRole("row", { name: /1-2/ })).toContainText("587");
}

test("the downloadable HTML shares readings between a row and garage card", async ({
  page,
}, info) => {
  const file = info.outputPath("cooperative-demo.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  await page.goto(pathToFileURL(file).href);
  await expect(page.getByRole("heading", { name: "Гаражі", exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Електрика", exact: true }).click();
  await saveSingleReading(page);
  await page.reload();
  await saveFromGarageCard(page, true);
  await page.reload();
  await expect(page.getByRole("row", { name: /1-01/ })).toContainText(/1\s280/);
});

test("the same HTML saves when the preview blocks native form submission", async ({ page }) => {
  await page.route("**/demo-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<iframe title="Демо" src="/demo-document#electricity" sandbox="allow-scripts allow-same-origin"></iframe>',
    }),
  );
  await page.route("**/demo-document", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/demo-preview");
  const screen = page.frameLocator("iframe");
  await saveSingleReading(screen, true);
  await saveFromGarageCard(screen, false);
});
