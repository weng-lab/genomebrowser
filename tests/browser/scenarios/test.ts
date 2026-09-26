import { test as base, expect } from "@playwright/test";

// Keep browser failures visible and prevent scenarios from depending on live services.
// Requests to our fixture server still go through the real HTTP/reader implementation.
export const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await context.route(/^https?:/, async (route) => {
      if (new URL(route.request().url()).origin !== baseURL) {
        errors.push(`Unexpected external request: ${route.request().url()}`);
        await route.abort();
      } else {
        await route.continue();
      }
    });
    await use(page);
    expect(errors, "Unexpected browser errors or external requests").toEqual([]);
  },
});
export { expect };
