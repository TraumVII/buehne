import { test, expect } from '@playwright/test';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { formatVocabularyMarkdown } from '../js/parser.js';

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

    await page.setViewportSize({ width: 874, height: 402 });
    await page.evaluate(() => {
      window.Buehne.setThroughShot(false);
      window.Buehne.parse('eine Person steht, links ein Tisch, rechts ein Stuhl, hinten ein Baum, Kamera amerikanisch, Mittag');
      window.Buehne.setWorkView([5.4, 3.1, 5.9], [0, 0.85, 0]);
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(screenshotDir, '04-querformat.png'), fullPage: true });
    await page.evaluate(() => window.Buehne.setThroughShot(true));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '05-querformat-shot.png'), fullPage: true });
  });

  test('ungültiger JSON-Import lässt die Szene unverändert', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.evaluate(() => {
      window.Buehne.newScene();
      window.Buehne.insert('figure');
    });
    const before = await page.evaluate(() => window.Buehne.getState());
    const result = await page.evaluate(() => window.Buehne.loadJSON('{ "nope": true }'));
    const after = await page.evaluate(() => window.Buehne.getState());
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/gültiges Bühne-Szenenformat|Szenenformat/i);
    expect(after.itemCount).toBe(before.itemCount);
    expect(after.items.filter((item) => item.type === 'figure').length).toBe(1);
    await expect(page.locator('#toast')).toBeVisible();
    await expect(page.locator('#toast')).toContainText(/gültiges|Szenenformat|JSON/i);

    const badItems = await page.evaluate(() => window.Buehne.loadJSON(JSON.stringify({
      version: 1,
      items: [{ type: 'spaceship', position: [0, 0, 0] }]
    })));
    expect(badItems.ok).toBe(false);
    const still = await page.evaluate(() => window.Buehne.getState());
    expect(still.items.filter((item) => item.type === 'figure').length).toBe(1);
  });

  test('Parser: Mengen, Verneinung, Richtungen, Brennweite und getrennte Personen', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);

    const counts = await page.evaluate(() => window.Buehne.parse('zwei Personen und ein Tisch'));
    expect(counts.figures.count).toBe(2);
    expect(counts.objects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'table', count: 1 })
    ]));
    let state = await page.evaluate(() => window.Buehne.getState());
    expect(state.items.filter((item) => item.type === 'figure').length).toBe(2);
    expect(state.items.filter((item) => item.type === 'table').length).toBe(1);

    const negated = await page.evaluate(() => window.Buehne.parse('eine Person und kein Auto'));
    expect(negated.figures.count).toBe(1);
    expect(negated.objects.some((item) => item.type === 'car')).toBeFalsy();
    state = await page.evaluate(() => window.Buehne.getState());
    expect(state.items.filter((item) => item.type === 'figure').length).toBe(1);
    expect(state.items.filter((item) => item.type === 'car').length).toBe(0);

    const without = await page.evaluate(() => window.Buehne.parse('eine Person ohne Auto'));
    expect(without.figures.count).toBe(1);
    expect(without.objects.some((item) => item.type === 'car')).toBeFalsy();

    const placed = await page.evaluate(() => window.Buehne.parse('ein Tisch links, ein Stuhl rechts'));
    const table = placed.objects.find((item) => item.type === 'table');
    const chair = placed.objects.find((item) => item.type === 'chair');
    expect(table.position.x).toBeLessThan(0);
    expect(chair.position.x).toBeGreaterThan(0);
    state = await page.evaluate(() => window.Buehne.getState());
    expect(state.items.find((item) => item.type === 'table').position[0]).toBeLessThan(0);
    expect(state.items.find((item) => item.type === 'chair').position[0]).toBeGreaterThan(0);

    const mmSpace = await page.evaluate(() => window.Buehne.parse('Kamera 85 mm'));
    expect(mmSpace.camera.focalLength).toBe(85);
    state = await page.evaluate(() => window.Buehne.getState());
    expect(state.focalLength).toBe(85);

    const mmTight = await page.evaluate(() => window.Buehne.parse('85mm'));
    expect(mmTight.camera.focalLength).toBe(85);

    const people = await page.evaluate(() => window.Buehne.parse('eine Person sitzt links, eine andere steht rechts'));
    expect(people.figures.count).toBe(2);
    expect(people.figures.specs[0].pose).toBe('sitzen');
    expect(people.figures.specs[0].position.key).toMatch(/links/);
    expect(people.figures.specs[1].pose).toBe('stehen');
    expect(people.figures.specs[1].position.key).toMatch(/rechts/);
    state = await page.evaluate(() => window.Buehne.getState());
    const figures = state.items.filter((item) => item.type === 'figure');
    expect(figures).toHaveLength(2);
    const sitting = figures.find((item) => item.pose === 'sitzen');
    const standing = figures.find((item) => item.pose === 'stehen');
    expect(sitting.position[0]).toBeLessThan(0);
    expect(standing.position[0]).toBeGreaterThan(0);
  });

  test('Shot-Beschriftung aktualisiert sich nach Akt.', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.evaluate(() => {
      window.Buehne.newScene();
      window.Buehne.setAspect('16:9');
      window.Buehne.setFocalLength(35);
    });
    await page.getByRole('tab', { name: 'Kamera' }).click();
    await page.evaluate(() => window.Buehne.saveShot('Einstellung 1'));
    await expect(page.locator('#shot-list')).toContainText('35 mm');
    await page.evaluate(() => {
      window.Buehne.setFocalLength(85);
      window.Buehne.setAspect('9:16');
      const id = window.Buehne.getState().shots[0].id;
      window.Buehne.overwriteShot(id);
    });
    await expect(page.locator('#shot-list')).toContainText('85 mm');
    await expect(page.locator('#shot-list')).toContainText('9:16');
  });

  test('Undo stellt das Seitenverhältnis wieder her', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.evaluate(() => {
      window.Buehne.newScene();
      window.Buehne.setAspect('16:9');
    });
    expect(await page.evaluate(() => window.Buehne.getState().aspect)).toBe('16:9');
    await page.evaluate(() => window.Buehne.setAspect('9:16'));
    expect(await page.evaluate(() => window.Buehne.getState().aspect)).toBe('9:16');
    await page.evaluate(() => window.Buehne.undo());
    expect(await page.evaluate(() => window.Buehne.getState().aspect)).toBe('16:9');
  });

  test('VOCABULARY.md entspricht den Parser-Daten', () => {
    const disk = readFileSync(path.resolve(__dirname, '../VOCABULARY.md'), 'utf8');
    expect(disk).toBe(formatVocabularyMarkdown());
    expect(disk).toContain('Tisch');
    expect(disk).toContain('Stuhl');
    expect(disk).toContain('sitzt');
  });

  test('Wortschatz-Bereich listet Parser-Wörter und zeigt die Spracheingabe', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    await expect(page.locator('#btn-mic')).toBeVisible();
    await expect(page.locator('#btn-mic')).toContainText('Sprechen');
    const vocab = page.locator('#vocab-box');
    await expect(vocab).toBeVisible();
    await expect(vocab.locator('summary')).toHaveText('Was die App versteht');
    await vocab.locator('summary').click();
    await expect(vocab).toContainText('Tisch');
    await expect(vocab).toContainText('Stuhl');
    await expect(vocab).toContainText('sitzt');
    await page.evaluate(() => {
      const panels = document.getElementById('panels');
      const mic = document.getElementById('btn-mic');
      if (!panels || !mic) return;
      const delta = mic.getBoundingClientRect().top - panels.getBoundingClientRect().top;
      panels.scrollTop += delta - 6;
    });
    await page.waitForTimeout(300);
    const micBox = await page.locator('#btn-mic').boundingBox();
    const vocabBox = await page.locator('#vocab-box summary').boundingBox();
    const sheetBox = await page.locator('#sheet').boundingBox();
    expect(micBox.y).toBeGreaterThan(sheetBox.y + 36);
    expect(micBox.y + 24).toBeLessThan(sheetBox.y + sheetBox.height);
    expect(vocabBox.y).toBeGreaterThan(sheetBox.y + 36);
    expect(vocabBox.y + 20).toBeLessThan(sheetBox.y + sheetBox.height);
    await page.screenshot({ path: path.join(screenshotDir, '06-sprache.png'), fullPage: true });
  });
});

test.describe('Querformat', () => {
  test.use({ viewport: { width: 874, height: 402 } });

  test('Bühne nutzt den freien Bereich und Tap wählt aus', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => window.Buehne.getLayoutInfo());
    expect(info.layout).toBe('landscape');
    expect(info.visibleRect.w).toBeGreaterThan(280);
    expect(info.visibleRect.h).toBeGreaterThan(180);
    expect(info.sheet).toBeTruthy();
    expect(info.visibleRect.x + info.visibleRect.w).toBeLessThanOrEqual(info.sheet.left - info.canvas.left + 1);

    const id = await page.evaluate(() => {
      window.Buehne.newScene();
      const cubeId = window.Buehne.insert('cube');
      window.Buehne.clearSelection();
      window.Buehne.setWorkView([0, 1.2, 3.6], [0, 0.3, 0]);
      return cubeId;
    });
    await page.waitForTimeout(400);
    const click = await page.evaluate(() => {
      const layout = window.Buehne.getLayoutInfo();
      return {
        x: layout.canvas.left + layout.visibleRect.x + layout.visibleRect.w / 2,
        y: layout.canvas.top + layout.visibleRect.y + layout.visibleRect.h / 2
      };
    });
    await page.mouse.click(click.x, click.y);
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => window.Buehne.getState());
    expect(state.selectedId).toBe(id);
  });

  test('alle Registerkarten sind vollständig sichtbar', async ({ page }) => {
    await page.goto('/');
    await waitReady(page);
    await page.waitForTimeout(300);
    const names = ['Einfügen', 'Bearbeiten', 'Kamera', 'Licht', 'Text', 'Export'];
    for (const name of names) {
      const tab = page.getByRole('tab', { name, exact: true });
      await expect(tab).toBeVisible();
      await expect(tab).toBeInViewport();
      const box = await tab.boundingBox();
      expect(box).toBeTruthy();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(875);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.y + box.height).toBeLessThanOrEqual(403);
    }
    await page.screenshot({ path: path.join(screenshotDir, '07-querformat-tabs.png'), fullPage: true });
  });
});

function installFakeSpeech(page) {
  return page.addInitScript(() => {
    class FakeSpeechRecognition {
      constructor() {
        this.lang = '';
        this.interimResults = false;
        this.continuous = false;
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
        this.onstart = null;
        window.__lastRecognition = this;
      }
      start() {
        this._started = true;
        this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
  });
}

test.describe('Spracheingabe', () => {
  test('übernimmt erkannten Text und baut die Szene', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/');
    await waitReady(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    await expect(page.locator('#chk-auto-parse')).toBeChecked();
    await page.getByRole('button', { name: /Sprechen|Spracheingabe|Hört zu/ }).click();
    await expect(page.locator('#btn-mic')).toContainText('Hört zu');
    await page.evaluate(() => {
      const rec = window.__lastRecognition;
      const results = [{
        0: { transcript: 'eine Person sitzt links, eine andere steht rechts' },
        isFinal: true,
        length: 1
      }];
      rec.onresult({ results, resultIndex: 0 });
      rec.onend();
    });
    await expect(page.locator('#input-prompt')).toHaveValue(/eine Person sitzt links, eine andere steht rechts/);
    const state = await page.evaluate(() => window.Buehne.getState());
    expect(state.items.filter((item) => item.type === 'figure')).toHaveLength(2);
    const sitting = state.items.find((item) => item.pose === 'sitzen');
    const standing = state.items.find((item) => item.pose === 'stehen');
    expect(sitting.position[0]).toBeLessThan(0);
    expect(standing.position[0]).toBeGreaterThan(0);
  });

  test('zeigt einen Hinweis bei verweigerter Mikrofon-Berechtigung', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/');
    await waitReady(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    await page.getByRole('button', { name: /Sprechen|Spracheingabe|Hört zu/ }).click();
    await page.evaluate(() => {
      const rec = window.__lastRecognition;
      rec.onerror({ error: 'not-allowed' });
      rec.onend();
    });
    await expect(page.locator('#speech-status')).toBeVisible();
    await expect(page.locator('#speech-status')).toContainText(/Mikrofon|Berechtigung|erlauben/i);
  });

  test('zeigt einen Fallback-Hinweis ohne Speech API', async ({ page }) => {
    await page.addInitScript(() => {
      window.SpeechRecognition = undefined;
      window.webkitSpeechRecognition = undefined;
    });
    await page.goto('/');
    await waitReady(page);
    await page.getByRole('tab', { name: 'Text' }).click();
    await page.getByRole('button', { name: /Sprechen|Spracheingabe/ }).click();
    await expect(page.locator('#speech-status')).toBeVisible();
    await expect(page.locator('#speech-status')).toContainText(/nicht unterstützt|Tastatur|iOS|iPhone/i);
  });
});
