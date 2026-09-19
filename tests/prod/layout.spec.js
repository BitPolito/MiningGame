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
  const meta = await page.evaluate(() => JSON.parse(sessionStorage.getItem('bp-solo-session-v4')));
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

test('rules difficulty tabs keep contrast on hover without separator lines', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play' }).click();
  const dialog = page.getByRole('dialog');
  const easy = dialog.getByRole('tab', { name: /Easy/ });
  const hard = dialog.getByRole('tab', { name: /Hard/ });
  await expect(easy).toHaveAttribute('aria-selected', 'true');

  const styles = await dialog.evaluate((element) => {
    const header = element.querySelector('.bp-rules-modal__header');
    const tabs = element.querySelector('.bp-rules-modal__tabs');
    return {
      headerBorder: getComputedStyle(header).borderBottomWidth,
      tabsBorder: getComputedStyle(tabs).borderBottomWidth,
    };
  });
  expect(styles).toEqual({ headerBorder: '0px', tabsBorder: '0px' });

  for (const selected of [easy, hard]) {
    if (selected === hard) await hard.click();
    await expect(selected).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(selected).toHaveCSS('background-color', 'rgb(0, 28, 224)');
    const normal = await selected.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });
    expect(normal).toEqual({ color: 'rgb(255, 255, 255)', background: 'rgb(0, 28, 224)' });
    await selected.hover();
    await expect.poll(() => selected.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    })).toEqual(normal);
  }
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'rules-guide');
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
  await expect(page.locator('.bp-panel--mempool-full .mempool-table tbody tr')).toHaveCount(15);
  await screenshot(page, testInfo, 'easy-workspace');
  if (width <= 900) {
    const lastRow = page.locator('.bp-panel--mempool-full .mempool-table tbody tr').last();
    await lastRow.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(100);
    const clearance = await page.evaluate(() => {
      const row = document.querySelector('.bp-panel--mempool-full .mempool-table tbody tr:last-child').getBoundingClientRect();
      const dock = document.querySelector('.bp-mobile-mining-dock').getBoundingClientRect();
      const balances = document.querySelector('.bp-available-balances').getBoundingClientRect();
      return {
        aboveDock: dock.top - row.bottom,
        belowBalances: row.top - balances.bottom,
      };
    });
    expect(clearance.aboveDock).toBeGreaterThanOrEqual(8);
    expect(clearance.belowBalances).toBeGreaterThanOrEqual(8);
    const metricOverflow = await page.locator('.mempool-table td.mempool-col-amount').evaluateAll((cells) =>
      Math.max(...cells.map((cell) => cell.scrollWidth - cell.clientWidth)),
    );
    expect(metricOverflow).toBeLessThanOrEqual(1);
    if (width === 393) {
      await page.screenshot({ path: testInfo.outputPath('easy-mempool-last.png') });
    }
  }
  const { nonce } = await selectOptimalTransactions(page, 'easy');
  const mobile = width <= 900;
  const control = mobile ? page.locator('.bp-mobile-mining-dock') : page.locator('.bp-panel--mining-action');
  await expect(control.locator('.bp-easy-targets dd')).toHaveCount(2);
  if (mobile) {
    await expect(control.getByRole('button', { name: 'Show formula' })).toBeVisible();
  }
  await control.locator(mobile ? '.bp-mobile-mining-dock__input' : '#nonce-easy').fill(String(nonce));
  await control.getByRole('button', { name: 'Mine block' }).click();
  await expect(page.locator('.bp-chain__node--latest')).toHaveCount(1);
  await assertNoPageOverflow(page);
});

test('Hard selection and dice remain usable without overlap', async ({ page }, testInfo) => {
  await startSolo(page, 'hard');
  await expect(page.locator('.bp-panel--mempool-full .mempool-table tbody tr')).toHaveCount(15);
  await expect(page.getByText(/shake to roll/i)).toHaveCount(0);
  await selectOptimalTransactions(page, 'hard');
  const balanceAlignment = await page.locator('.bp-balance-chip--changed').evaluateAll((chips) => chips.map((chip) => {
    const box = chip.getBoundingClientRect();
    const name = chip.querySelector('.bp-balance-chip__name').getBoundingClientRect();
    const value = chip.querySelector('.bp-balance-chip__value').getBoundingClientRect();
    const reserved = chip.querySelector('.bp-balance-chip__reserved').getBoundingClientRect();
    const center = (rect, axis) => axis === 'x' ? rect.x + rect.width / 2 : rect.y + rect.height / 2;
    return {
      numericAxisDelta: Math.abs(center(value, 'x') - center(reserved, 'x')),
      nameCenterDelta: Math.abs(center(name, 'y') - center(box, 'y')),
      numericVerticalOffset: ((value.top + reserved.bottom) / 2) - center(box, 'y'),
    };
  }));
  expect(balanceAlignment.length).toBeGreaterThan(0);
  expect(Math.max(...balanceAlignment.map((item) => item.numericAxisDelta))).toBeLessThanOrEqual(1);
  expect(Math.max(...balanceAlignment.map((item) => item.nameCenterDelta))).toBeLessThanOrEqual(2);
  expect(Math.min(...balanceAlignment.map((item) => item.numericVerticalOffset))).toBeGreaterThanOrEqual(3);
  expect(Math.max(...balanceAlignment.map((item) => item.numericVerticalOffset))).toBeLessThanOrEqual(5);
  const mobile = page.viewportSize().width <= 900;
  const control = mobile ? page.locator('.bp-mobile-mining-dock') : page.locator('.bp-panel--mining-action');
  if (mobile) {
    await expect(control.locator('.bp-compact-dice .bp-die')).toHaveCount(4);
    await expect(control.locator('.bp-mobile-mining-dock__handle')).toHaveCount(0);
  }
  await expect(control.getByRole('button', { name: 'Roll 5 times' })).toHaveCount(0);
  await expect(control.getByRole('button', { name: 'Roll the dice', exact: true })).toBeVisible();
  await control.getByRole('button', { name: 'Roll the dice', exact: true }).click();
  await expect(page.locator('.bp-panel--mempool-full tr[aria-pressed="true"]')).toHaveCount(3);
  if (!mobile) {
    await control.getByRole('button', { name: 'Block candidate details' }).click();
    const details = control.locator('.bp-candidate-details');
    await expect(details).toBeVisible();
    const layout = await details.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      parentWidth: element.parentElement.getBoundingClientRect().width,
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      hashOverflow: Math.max(0, ...[...element.querySelectorAll('.bp-hash')]
        .map((hash) => hash.scrollWidth - hash.clientWidth)),
    }));
    expect(layout.width).toBeLessThanOrEqual(layout.parentWidth + 1);
    expect(layout.columns).toBe(1);
    expect(layout.hashOverflow).toBeLessThanOrEqual(1);
  }
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
  const showLink = page.getByRole('button', { name: 'Show join link' });
  await showLink.click();
  const joinLink = page.locator('.bp-room-invite__link-value');
  await expect(joinLink).toBeVisible();
  await expect(joinLink).toHaveAttribute('href', /[?&]join=[A-Z0-9]+$/);
  const linkLayout = await joinLink.evaluate((element) => ({
    overflow: element.scrollWidth - element.clientWidth,
    panelOverflow: element.parentElement.scrollWidth - element.parentElement.clientWidth,
  }));
  expect(linkLayout.overflow).toBeLessThanOrEqual(1);
  expect(linkLayout.panelOverflow).toBeLessThanOrEqual(1);
  const qr = page.getByRole('button', { name: 'Open a larger QR code' });
  await expect(qr.locator('svg, canvas, img')).toBeVisible();
  const codeBox = await page.locator('.bp-room-invite--featured .bp-room-invite__code-block').boundingBox();
  const qrBox = await qr.boundingBox();
  expect(qrBox.y).toBeGreaterThan(codeBox.y + codeBox.height - 2);
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'host-dashboard');
  await qr.click();
  await expect(page.getByRole('dialog').locator('.bp-qr-dialog__image')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});


test('the host can watch a full 30-miner race without the join QR', async ({ page, request }, testInfo) => {
  const width = page.viewportSize().width;

  const createdResponse = await request.post('/api/room?action=create', {
    data: { hostName: 'Observer', hostParticipates: false, numPlayers: 30, difficulty: 'easy', blocksToWin: 3 },
  });
  expect(createdResponse.ok()).toBe(true);
  const created = await createdResponse.json();
  const { seed, sessionToken } = created;
  let firstMinerToken = '';
  for (let index = 1; index <= 30; index += 1) {
    const response = await request.post('/api/room?action=join', {
      data: { seed, playerName: 'Miner ' + index },
    });
    expect(response.ok()).toBe(true);
    if (index === 1) firstMinerToken = (await response.json()).sessionToken;
  }
  const startResponse = await request.post('/api/room?action=start', {
    data: { seed },
    headers: { Authorization: 'Bearer ' + sessionToken },
  });
  expect(startResponse.ok()).toBe(true);
  const privateResponse = await request.get('/api/room?action=status&seed=' + encodeURIComponent(seed), {
    headers: { Authorization: 'Bearer ' + firstMinerToken },
  });
  const { playerState } = await privateResponse.json();
  const selected = getValidBlockSelections(playerState.mempool, playerState.balances)
    .sort((a, b) => b.totalFees - a.totalFees)[0];
  const txs = getTransactionsInSelectionOrder(playerState.mempool, selected.ids);
  const nonce = playerState.target - playerState.prevTarget - computeBlockValue(txs);
  const minedResponse = await request.post('/api/room?action=mine', {
    data: { seed, blockIndex: playerState.blockNum, selectedTxIds: selected.ids, nonce },
    headers: { Authorization: 'Bearer ' + firstMinerToken },
  });
  expect(minedResponse.ok()).toBe(true);

  await page.addInitScript(({ roomSeed, token }) => {
    localStorage.setItem('bp-room-session-v5', JSON.stringify({
      seed: roomSeed, sessionToken: token, role: 'host', displayName: 'Observer', hostParticipates: false,
    }));
  }, { roomSeed: seed, token: sessionToken });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
  const race = page.locator('.bp-host-dash--live .bp-host-race-list');
  await expect(race.locator('.bp-host-race-list__row')).toHaveCount(30);
  await expect(race.locator('.bp-host-race-list__row').first()).toContainText('Miner 1');
  await expect(race.locator('.bp-host-race-list__row').first()).toContainText('1/3');
  await expect(race.locator('.bp-host-race-list__miner')).toHaveCount(30);
  await expect(page.locator('.bp-room-invite__qr-button')).toHaveCount(0);
  const columns = await race.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1);
  const raceBox = await race.boundingBox();
  expect(raceBox.y).toBeLessThan(page.viewportSize().height * (width < 600 ? 0.7 : 0.5));
  await assertNoPageOverflow(page);
  await screenshot(page, testInfo, 'live-host-race');
});
