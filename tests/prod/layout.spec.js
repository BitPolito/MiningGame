import { expect, test } from '@playwright/test';
import { createInitialGameState } from '../../src/lib/gameEngine.js';
import { getTransactionsInSelectionOrder, getValidBlockSelections } from '../../src/lib/txSelection.js';
import { computeBlockValue } from '../../src/lib/easyMining.js';

async function assertNoPageOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
}

async function startSolo(page, difficulty) {
  await page.goto('/');
  await page.getByRole('button', { name: /Play Solo/ }).click();
  if (difficulty === 'hard') await page.getByRole('radio', { name: /Hard/ }).first().click();
  await assertNoPageOverflow(page);
  await page.getByRole('button', { name: /Start mining/ }).click();
}

async function selectOptimalTransactions(page, difficulty) {
  const meta = await page.evaluate(() => JSON.parse(sessionStorage.getItem('bp-solo-session-v3')));
  const state = createInitialGameState(difficulty, meta.id, meta.powLevel);
  const best = getValidBlockSelections(state.mempool, state.balances)
    .sort((a, b) => b.totalFees - a.totalFees)[0];
  expect(best).toBeTruthy();
  const rows = page.locator('.bp-panel--mempool-full .mempool-table tbody tr');
  for (const id of best.ids) {
    const index = state.mempool.findIndex((tx) => tx.id === id);
    await rows.nth(index).click();
  }
  await expect(page.locator('.bp-panel--mempool-full tr[aria-pressed="true"]')).toHaveCount(3);
  const txs = getTransactionsInSelectionOrder(state.mempool, best.ids);
  return { nonce: state.target - state.prevTarget - computeBlockValue(txs) };
}

async function screenshot(page, testInfo, name) {
  if (![393, 1440].includes(page.viewportSize().width)) return;
  await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true });
}

test('home and setup remain proportional in production assets', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Play Solo/ })).toBeVisible();
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'home');
  await page.getByRole('button', { name: /Play Solo/ }).click();
  await expect(page.getByRole('button', { name: /Start mining/ })).toBeVisible();
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'setup');
});

test('Easy workspace, HUD and mining work on the production build', async ({ page }, testInfo) => {
  await startSolo(page, 'easy');
  const width = page.viewportSize().width;
  const css = await page.evaluate(() => ({
    dock: getComputedStyle(document.querySelector('.bp-mobile-mining-dock')).display,
    metrics: getComputedStyle(document.querySelector('.bp-game-hud__metrics')).display,
    workspace: getComputedStyle(document.querySelector('.bp-game-workspace')).display,
    stack: getComputedStyle(document.querySelector('.bp-game-play-stack')).display,
  }));
  expect(css.dock === 'none').toBe(width > 900);
  expect(css.metrics).toBe('grid');
  expect(css.workspace).toBe('flex');
  expect(css.stack).toBe(width >= 1024 ? 'grid' : 'flex');
  const [metricsBox, chainBox] = await Promise.all([
    page.locator('.bp-game-hud__metrics').boundingBox(),
    page.locator('.bp-game-pinboard').boundingBox(),
  ]);
  expect(chainBox.y).toBeGreaterThanOrEqual(metricsBox.y + metricsBox.height - 2);
  if (width > 900) {
    const [mempoolBox, miningBox] = await Promise.all([
      page.locator('.bp-panel--mempool-full').boundingBox(),
      page.locator('.bp-panel--mining-action').boundingBox(),
    ]);
    if (width >= 1024) expect(miningBox.x).toBeGreaterThanOrEqual(mempoolBox.x + mempoolBox.width - 2);
    else expect(miningBox.y).toBeGreaterThanOrEqual(mempoolBox.y + mempoolBox.height - 2);
  }
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'easy-workspace');
  const { nonce } = await selectOptimalTransactions(page, 'easy');
  const mobile = width <= 900;
  const control = mobile ? page.locator('.bp-mobile-mining-dock') : page.locator('.bp-panel--mining-action');
  await control.locator(mobile ? '.bp-mobile-mining-dock__input' : '#nonce-easy').fill(String(nonce));
  await control.getByRole('button', { name: 'Mine block' }).click();
  await expect(page.locator('.bp-chain__node--latest')).toHaveCount(1);
  await assertNoPageOverflow(page);
});

test('Hard selection and dice remain usable without overlap', async ({ page }, testInfo) => {
  await startSolo(page, 'hard');
  await selectOptimalTransactions(page, 'hard');
  const mobile = page.viewportSize().width <= 900;
  const control = mobile ? page.locator('.bp-mobile-mining-dock') : page.locator('.bp-panel--mining-action');
  await expect(control.getByRole('button', { name: 'Roll the dice' })).toBeVisible();
  await control.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.bp-panel--mempool-full tr[aria-pressed="true"]')).toHaveCount(3);
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'hard-mining');
});

test('spectator lobby and host dashboard show a scannable expandable QR', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create Room/ }).click();
  await assertNoPageOverflow(page);
  await page.getByRole('button', { name: 'Create Room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
  await expect(page.getByText('0 of 3 miners joined')).toBeVisible();
  const overview = page.locator('.bp-host-dash__overview');
  const invite = page.locator('.bp-host-dash__overview > .bp-room-invite');
  const control = page.locator('.bp-host-dash__control');
  const inviteBox = await invite.boundingBox();
  const controlBox = await (page.viewportSize().width < 760
    ? page.locator('.bp-host-dash__hero').boundingBox()
    : control.boundingBox());
  expect(inviteBox).toBeTruthy();
  expect(controlBox).toBeTruthy();
  if (page.viewportSize().width >= 900) {
    expect(controlBox.x).toBeGreaterThan(inviteBox.x + inviteBox.width - 2);
  } else {
    expect(controlBox.y).toBeGreaterThan(inviteBox.y + inviteBox.height - 2);
  }
  await expect(overview).toBeVisible();
  const qr = page.getByRole('button', { name: 'Open a larger QR code' });
  await expect(qr.locator('svg, canvas, img')).toBeVisible();
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'host-dashboard');
  await qr.click();
  await expect(page.getByRole('dialog').locator('.bp-qr-dialog__image')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
