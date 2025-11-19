import { test, expect, type Page } from '@playwright/test';

test.describe('Wokwi Embed', () => {
  test('should start simulation and wait for output', async ({ page }: { page: Page }) => {
    await page.goto('http://127.0.0.1:8000/test/wokwi-embed/');

    // Wait 3 seconds after page load
    await page.waitForTimeout(3000);

    // Click the start button
    const startButton = page.locator('.start-button');
    await startButton.click();

    // Wait until output-text contains the expected messages
    const outputText = page.locator('#output-text');
    await expect(outputText).toContainText('Hello, World 2', { timeout: 60000 });
    await expect(outputText).toContainText('Hello, World 3', { timeout: 60000 });
    await expect(outputText).toContainText('Hello, World 4', { timeout: 60000 });
  });
});
