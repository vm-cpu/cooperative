import { expect, test } from "@playwright/test";
import { buildDemo } from "../scripts/build-demo.mjs";

test("garage people controls keep each garage and role independent in the embedded demo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 820 });
  const html = await buildDemo();
  await page.route("**/people-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<iframe title="Демо" sandbox="allow-scripts allow-same-origin" width="350" height="720" src="/people-document#garage/garage-01"></iframe>',
    }),
  );
  await page.route("**/people-document", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/people-preview");
  const demo = page.frameLocator("iframe");
  const category = demo.getByText("Власник і орендар", { exact: true });
  const owner = demo.getByRole("region", { name: "Власник", exact: true });
  const tenant = demo.getByRole("region", { name: "Орендар", exact: true });
  const save = (section) => section.getByRole("button", { name: "Зберегти", exact: true }).click();
  const remove = async (section) => {
    await section.getByRole("button", { name: "Прибрати", exact: true }).click();
    await section.getByRole("button", { name: "Так, прибрати", exact: true }).click();
  };
  await category.click();
  await expect(owner.getByRole("button")).toHaveText(["Замінити", "Прибрати"]);
  await owner.getByRole("button", { name: "Замінити" }).click();
  await owner.getByLabel("Людина").selectOption("owner-02");
  await save(owner);
  await expect(owner).toContainText("Прикладенко Микола Тестович");
  await expect(tenant).toContainText("Зразковий Андрій Ігорович");

  await demo.getByRole("link", { name: "Власники", exact: true }).click();
  await demo.getByRole("link", { name: "Тестова Олена Андріївна", exact: true }).click();
  const oldOwnerGarages = demo.getByRole("region", { name: "Гаражі власника" });
  await expect(oldOwnerGarages.getByRole("link", { name: "Гараж 1-2", exact: true })).toBeVisible();
  await expect(oldOwnerGarages.getByRole("link", { name: "Гараж 1-01", exact: true })).toHaveCount(
    0,
  );

  await demo.getByRole("link", { name: "Гаражі", exact: true }).click();
  await demo.getByRole("searchbox").fill("1-01");
  await demo.getByRole("link", { name: "Гараж 1-01", exact: true }).click();
  await category.click();
  await remove(owner);
  await expect(owner.getByRole("button")).toHaveText(["Додати"]);
  await expect(tenant).toContainText("Зразковий Андрій Ігорович");
  await expect(demo.getByText("Квитанції", { exact: true })).toBeVisible();

  await owner.getByRole("button", { name: "Додати" }).click();
  await owner.getByLabel("Людина").selectOption("new");
  await owner.getByLabel("ПІБ").fill("Тестова Наталія Іванівна");
  await owner.getByLabel("Телефон (необов’язково)").fill("+380 00 000 00 00");
  await save(owner);
  await expect(owner.getByRole("status")).toHaveText("Людину додано до гаража.");
  await expect(owner).toContainText("Тестова Наталія Іванівна");

  await demo.getByRole("link", { name: "Гаражі", exact: true }).click();
  await demo.getByRole("searchbox").fill("1-11");
  await demo.getByRole("link", { name: "Гараж 1-11", exact: true }).click();
  await category.click();
  await expect(tenant.getByRole("button")).toHaveText(["Додати"]);
  await tenant.getByRole("button", { name: "Додати" }).click();
  await tenant.getByLabel("Людина").selectOption({ label: "Тестова Наталія Іванівна" });
  await save(tenant);
  await expect(tenant).toContainText("Тестова Наталія Іванівна");
  await tenant.getByRole("button", { name: "Замінити" }).click();
  await tenant.getByLabel("Людина").selectOption({ label: "Зразковий Андрій Ігорович" });
  await save(tenant);
  await expect(tenant).toContainText("Зразковий Андрій Ігорович");
  await remove(tenant);
  await expect(tenant.getByRole("button")).toHaveText(["Додати"]);

  await demo.getByRole("link", { name: "Гаражі", exact: true }).click();
  await demo.getByRole("searchbox").fill("Зразковий Андрій");
  await expect(demo.getByRole("link", { name: "Гараж 1-11", exact: true })).toHaveCount(0);
  await demo.getByRole("link", { name: "Гараж 1-01", exact: true }).click();
  await category.click();
  await expect(owner).toContainText("Тестова Наталія Іванівна");
  await expect(tenant).toContainText("Зразковий Андрій Ігорович");
});
