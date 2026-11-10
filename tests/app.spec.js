import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.resolve(__dirname, '../screenshots');

async function waitReady(page) {
  await page.waitForFunction(() => window.Buehne && window.Buehne.isReady, null, { timeout: 20000 });
}

test.describe('Bühne', () => {
  test('lädt ohne Konsolenfehler', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await waitReady(page);
    await page.waitForTimeout(400);
    await expect(page.locator('.title strong')).toHaveText('Bühne');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('fügt Objekte ein', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    const before = await page.evaluate(() => window.Buehne.getState().itemCount);
    await page.evaluate(() => {
      window.Buehne.insert('cube');
      window.Buehne.insert('figure');
    });
    const after = await page.evaluate(() => window.Buehne.getState());
    expect(after.itemCount).toBe(before + 2);
    expect(after.items.some((item) => item.type === 'cube')).toBeTruthy();
    expect(after.items.some((item) => item.type === 'figure')).toBeTruthy();
  });

  test('Text-Parser erzeugt eine Szene', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    const result = await page.evaluate(() => window.Buehne.parse(
      'zwei Personen stehen sich gegenüber, links ein Tisch, Kamera halbnah, Abendlicht'
    ));
    expect(result.figures.count).toBe(2);
    expect(result.figures.formation).toBe('gegenueber');
    expect(result.objects.some((item) => item.type === 'table')).toBeTruthy();
    expect(result.camera.focalLength).toBe(50);
    expect(result.light).toBe('abend');
    const state = await page.evaluate(() => window.Buehne.getState());
    expect(state.items.filter((item) => item.type === 'figure').length).toBe(2);
    expect(state.items.filter((item) => item.type === 'table').length).toBe(1);
    expect(state.focalLength).toBe(50);
    expect(state.lightPreset).toBe('abend');
  });

  test('PNG-Export liefert ein gültiges Bild', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.evaluate(() => {
      window.Buehne.insert('figure');
      window.Buehne.insert('table');
    });
    const info = await page.evaluate(async () => {
      const result = await window.Buehne.exportPNG({ longEdge: 640, mode: 'color' });
      return {
        byteLength: result.bytes.length,
        header: result.bytes.slice(0, 8),
        width: result.width,
        height: result.height,
        mime: result.mime
      };
    });
    expect(info.header).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(info.width).toBeGreaterThan(100);
    expect(info.height).toBeGreaterThan(100);
    expect(info.byteLength).toBeGreaterThan(800);
    expect(info.mime).toBe('image/png');
  });

  test('Screenshots der Hauptansichten', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Screenshots nur einmal über Chromium');
    await page.goto('/');
    await waitReady(page);
    await page.evaluate(() => {
      window.Buehne.newScene();
      window.Buehne.parse('eine Person steht, links ein Tisch, rechts ein Stuhl, hinten ein Baum, Kamera amerikanisch, Mittag');
      window.Buehne.setWorkView([5.4, 3.1, 5.9], [0, 0.85, 0]);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, '01-hauptansicht.png'), fullPage: true });

    await page.evaluate(() => window.Buehne.setThroughShot(true));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '02-shot-kamera.png'), fullPage: true });

    await page.evaluate(() => {
      window.Buehne.setThroughShot(false);
      window.Buehne.parse('zwei Personen stehen sich gegenüber, links ein Tisch, Kamera halbnah, Abendlicht');
      window.Buehne.setWorkView([5.2, 3.0, 5.8], [0, 0.85, 0]);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, '03-text-prompt.png'), fullPage: true });
  });
});
