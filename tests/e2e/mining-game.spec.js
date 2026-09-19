import { expect, test } from '@playwright/test';
import { RANDOM_HOST_NAMES } from '../../src/lib/playerNames.js';

async function startSolo(page, difficulty = 'easy') {
  await page.goto('/');
  await page.getByRole('button', { name: /Play Solo/ }).click();
  if (difficulty === 'hard') {
    await page.getByRole('radio', { name: /Hard/ }).first().click();
    const setupSizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(setupSizes.scroll).toBeLessThanOrEqual(setupSizes.width + 1);
  }
  await page.getByRole('button', { name: /Start mining/ }).click();
}

async function optimalIndexes(page, difficulty, chooseSuboptimal = false) {
  return page.evaluate(async ({ mode, low }) => {
    const meta = JSON.parse(sessionStorage.getItem('bp-solo-session-v4'));
    const engine = await import('/src/lib/gameEngine.js');
    const selection = await import('/src/lib/txSelection.js');
    const easy = await import('/src/lib/easyMining.js');
    const state = engine.createInitialGameState(mode, meta.id, meta.powLevel);
    const valid = selection.getValidBlockSelections(state.mempool, state.balances)
      .sort((a, b) => b.totalFees - a.totalFees);
    const chosen = low ? valid.find((item) => item.totalFees < valid[0].totalFees) : valid[0];
    const txs = selection.getTransactionsInSelectionOrder(state.mempool, chosen.ids);
    return {
      indexes: chosen.ids.map((id) => state.mempool.findIndex((tx) => tx.id === id)),
      nonce: mode === 'easy' ? state.target - state.prevTarget - easy.computeBlockValue(txs) : 0,
    };
  }, { mode: difficulty, low: chooseSuboptimal });
}

async function clickMempoolRows(page, indexes) {
  const rows = page.locator('.bp-panel--mempool-full .mempool-table tbody tr');
  for (const index of indexes) await rows.nth(index).click();
}

async function inlineCenterDelta(control, labelSelector, iconSelector) {
  return control.evaluate((element, selectors) => {
    const label = element.querySelector(selectors.label);
    const icon = element.querySelector(selectors.icon);
    const labelRect = label.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const labelCenter = labelRect.top + labelRect.height / 2;
    const iconCenter = iconRect.top + iconRect.height / 2;
    return Math.abs(labelCenter - iconCenter);
  }, { label: labelSelector, icon: iconSelector });
}

test('menu remains usable without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Block Mining Game/);
  await expect(page.getByRole('button', { name: /Play Solo/ })).toBeVisible();
  await expect(page.locator('.main-menu .menu-footer')).toBeVisible();
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  const rulesBox = await page.getByRole('button', { name: 'How to play' }).boundingBox();
  const aboutBox = await page.locator('.bp-nav-actions--menu a').boundingBox();
  expect(Math.abs(rulesBox.y - aboutBox.y)).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('mining workspace adapts and block details work by keyboard', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Play Solo/ }).click();
  await page.getByRole('button', { name: /Start mining/ }).click();

  const mobile = testInfo.project.name.includes('mobile');
  const dock = page.locator('.bp-mobile-mining-dock');
  const summary = page.locator('.bp-panel--selected-summary');
  const compactRoute = page.locator('.mempool-route-mobile').first();
  const mempoolOverflow = await page.locator('.bp-panel--mempool-full .mempool-table-wrap').evaluate((element) => {
    const style = getComputedStyle(element);
    return { maxHeight: style.maxHeight, overflowY: style.overflowY };
  });
  expect(mempoolOverflow.maxHeight).toBe('none');
  expect(mempoolOverflow.overflowY).toBe('visible');
  await expect(dock)[mobile ? 'toBeVisible' : 'toBeHidden']();
  await expect(summary)[mobile ? 'toBeHidden' : 'toBeVisible']();
  await expect(compactRoute)[mobile ? 'toBeVisible' : 'toBeHidden']();
  await expect(page.locator('.bp-available-balances')).toBeVisible();
  await expect(page.locator('.bp-balance-chip')).toHaveCount(4);
  await expect(page.locator('.bp-mempool-quick-tools')).toHaveCount(0);

  const historyToggle = page.getByRole('button', { name: 'Show history' });
  expect(await inlineCenterDelta(historyToggle, '.bp-available-balances__history-label', 'svg')).toBeLessThanOrEqual(1);
  const candidateToggle = page.locator('.bp-mempool-intro .bp-collapse__trigger').first();
  expect(await inlineCenterDelta(candidateToggle, '.bp-collapse__title', 'svg')).toBeLessThanOrEqual(1);
  await historyToggle.click();
  await expect(page.getByRole('button', { name: 'Hide history' })).toBeVisible();
  await expect(page.locator('.bp-balance-history-card').first())[mobile ? 'toBeVisible' : 'toBeHidden']();
  await expect(page.locator('.balance-sheet-table'))[mobile ? 'toBeHidden' : 'toBeVisible']();
  await page.getByRole('button', { name: 'Hide history' }).click();
  await expect(page.locator('.balance-sheet-table')).toHaveCount(0);

  const firstMetrics = page.locator('.mempool-table tbody td.mempool-col-amount').first();
  await expect(firstMetrics.locator('.mempool-metric-label').first())[mobile ? 'toBeVisible' : 'toBeHidden']();
  await expect(firstMetrics.locator('.mempool-metric-unit'))[mobile ? 'toBeVisible' : 'toBeHidden']();
  if (mobile) await expect(firstMetrics).toContainText(/Amount.*BTC.*Fee/);

  if (mobile) {
    const dockHandle = dock.locator('.bp-mobile-mining-dock__handle');
    expect(await inlineCenterDelta(dockHandle, 'span:first-child', 'svg')).toBeLessThanOrEqual(1);

    const rows = page.locator('.bp-panel--mempool-full .mempool-table tbody tr');
    for (let index = 0; index < await rows.count(); index += 1) {
      await rows.nth(index).click();
      if (await rows.nth(index).getAttribute('aria-pressed') === 'true') break;
    }
    await expect(page.locator('.bp-balance-chip--changed')).toHaveCount(1);
    await expect(page.locator('.mempool-selection-order')).toHaveText('1');
    await expect(dock.locator('.bp-candidate-slot--filled')).toHaveCount(1);
    await dock.locator('.bp-candidate-slot--filled').click();
    await expect(dock.locator('.bp-candidate-slot--filled')).toHaveCount(0);
    await expect(dock.locator('.bp-easy-targets dd')).toHaveCount(2);
    await dock.locator('.bp-mobile-mining-dock__handle').click();
    await expect(dock.locator('.easy-formula-panel')).toBeVisible();
    await dock.locator('.bp-mobile-mining-dock__handle').click();
    await expect(dock.locator('.easy-formula-panel')).toBeHidden();
  }

  const genesis = page.locator('.bp-chain__node--clickable').first();
  await genesis.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('Easy keeps arithmetic manual, rejects lower fees at mining and restores a draft', async ({ page }) => {
  await startSolo(page, 'easy');
  await expect(page.locator('.easy-formula-panel__part--emph strong')).toHaveCount(0);
  await expect(page.locator('.bp-mining-phases [aria-current="step"]')).toContainText('Choose 3 transactions');

  const lower = await optimalIndexes(page, 'easy', true);
  await clickMempoolRows(page, lower.indexes);
  const controls = await visibleMiningControls(page, 'Mine block');
  await controls.nonceInput.fill(String(lower.nonce));
  await controls.action.click();
  await expect(page.getByText(/higher total fees/).first()).toBeVisible();

  await clickMempoolRows(page, lower.indexes);
  const optimal = await optimalIndexes(page, 'easy');
  await clickMempoolRows(page, optimal.indexes);
  await controls.nonceInput.fill(String(optimal.nonce));
  await controls.action.click();
  await expect(page.getByText(/earned .* fees/).first()).toBeVisible();
  await expect(page.locator('.bp-chain__node--latest')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show history' }).click();
  await expect(page.locator('.balance-sheet-table th')).toHaveCount(3);
  await expect(page.locator('.bp-balance-history-card')).toHaveCount(2);
  await expect(page.locator('.bp-balance-history-card').last())[controls.mobile ? 'toBeVisible' : 'toBeHidden']();
  await page.getByRole('button', { name: 'Hide history' }).click();

  await page.locator('.bp-chain__node--latest').click();
  await expect(page.getByRole('dialog')).toContainText('Block #1');
  await page.getByRole('dialog').getByRole('button', { name: 'Previous block' }).click();
  await expect(page.getByRole('dialog')).toContainText('Block #0');
  await page.keyboard.press('Escape');

  const rows = page.locator('.bp-panel--mempool-full .mempool-table tbody tr');
  for (let index = 0; index < await rows.count(); index += 1) {
    await rows.nth(index).click();
    if (await rows.nth(index).getAttribute('aria-pressed') === 'true') break;
  }
  await controls.nonceInput.fill('123');
  await page.reload();
  await expect(page.locator('.bp-panel--mempool-full tr[aria-pressed="true"]')).toHaveCount(1);
  const restoredControls = await visibleMiningControls(page);
  await expect(restoredControls.nonceInput).toHaveValue('123');
  await expect(page.getByText('Your in-progress block was restored.')).toBeVisible();
});

test('Hard persists randomly drawn targets without a target selector', async ({ page }) => {
  await startSolo(page, 'hard');
  const values = await page.evaluate(async () => {
    const meta = JSON.parse(sessionStorage.getItem('bp-solo-session-v4'));
    const saved = JSON.parse(sessionStorage.getItem(`bp-game-draft-v5:hard:solo:${meta.id}`));
    const state = saved.gameState;
    return { powLevel: meta.powLevel, targetByte: parseInt(state.targetHash.slice(0, 2), 16), scheduleLength: state.powSchedule.length };
  });
  expect(values.powLevel).toBe('2');
  expect([3, 4, 5]).toContain(values.targetByte);
  expect(values.scheduleLength).toBe(13);
  await expect(page.getByRole('slider', { name: /PoW difficulty/ })).toHaveCount(0);

  if (!(await page.locator('.bp-mobile-mining-dock').isVisible())) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const miningRect = await page.locator('.bp-panel--mining-action').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    const verifierRect = await page.getByRole('button', { name: /HASH256 verifier/ }).locator('..').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    expect(miningRect.bottom).toBeLessThanOrEqual(verifierRect.top + 1);
  }
});

test('Hard validates fees before PoW and restores dice progress', async ({ page }) => {
  await startSolo(page, 'hard');
  const optimal = await optimalIndexes(page, 'hard');
  await clickMempoolRows(page, optimal.indexes);
  const firstMempoolRow = page.locator('.bp-panel--mempool-full .mempool-table tbody tr').first();
  const columnCount = await firstMempoolRow.locator('td').count();
  expect(columnCount).toBe(6);
  const controls = await visibleMiningControls(page, 'Roll the dice');
  await controls.action.evaluate((button) => button.click());
  await page.waitForTimeout(50);
  await expect(firstMempoolRow).toHaveAttribute('aria-disabled', 'true');
  await expect(firstMempoolRow.locator('td')).toHaveCount(columnCount);
  if (controls.mobile) {
    await expect(controls.dock.locator('.bp-compact-dice .bp-die:not(.bp-die--empty)')).toHaveCount(4);
    await expect(controls.dock.locator('.bp-mobile-pow__readout')).toContainText('1 roll so far');
    await expect(controls.dock.locator('.bp-mobile-mining-dock__handle')).toHaveCount(0);
  } else {
    await expect(page.getByText(/1 roll so far|Valid hash found/).first()).toBeVisible();
  }
  const powDialog = page.getByRole('dialog');
  if (await powDialog.isVisible()) await powDialog.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Block HASH256 verifier' }).click();
  await expect(page.getByText('SHA-256 · first round')).toBeVisible();
  await expect(page.getByText('SHA-256 · second round (raw digest)')).toBeVisible();
  const headerHex = await page.locator('.bp-hash-pipeline__step').first().locator('.bp-hash').textContent();
  expect(headerHex.trim()).toHaveLength(160);
  await page.reload();
  await expect(page.locator('.bp-panel--mempool-full tr[aria-pressed="true"]')).toHaveCount(3);
  const restoredControls = await visibleMiningControls(page);
  if (restoredControls.mobile) {
    await expect(restoredControls.dock.locator('.bp-mobile-pow__readout')).toContainText('1 roll so far');
    await expect(restoredControls.dock.locator('.bp-compact-dice .bp-die:not(.bp-die--empty)')).toHaveCount(4);
  } else {
    await expect(page.getByText(/1 roll so far|Valid hash found/).first()).toBeVisible();
  }
});

test('mobile Hard rolls one nonce with four visible dice and no details tab', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await startSolo(page, 'hard');
  const optimal = await optimalIndexes(page, 'hard');
  await clickMempoolRows(page, optimal.indexes);
  const dock = page.locator('.bp-mobile-mining-dock--pow');
  await expect(dock).toBeVisible();
  await expect(dock.locator('.bp-compact-dice .bp-die')).toHaveCount(4);
  await expect(dock.locator('.bp-mobile-mining-dock__handle')).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Roll 5 times' })).toHaveCount(0);
  await dock.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(dock.locator('.bp-mobile-pow__readout')).not.toContainText('Rolling…');
  const readout = await dock.locator('.bp-mobile-pow__readout').textContent();
  const attempts = Number(readout.match(/(\d+) rolls? so far/)?.[1]);
  expect(attempts).toBe(1);
  await expect(dock.locator('.bp-compact-dice .bp-die:not(.bp-die--empty)')).toHaveCount(4);
  const widths = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.width + 1);
});

test('mobile notices remain readable above the dock and restart on repeated errors', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await page.clock.install();
  await startSolo(page, 'easy');
  const optimal = await optimalIndexes(page, 'easy');
  await clickMempoolRows(page, optimal.indexes);
  const controls = await visibleMiningControls(page, 'Mine block');
  await controls.nonceInput.fill('0');
  await controls.action.click();
  const notice = page.locator('.game-toast');
  await expect(notice).toContainText('valid positive number');
  const noticeBox = await notice.boundingBox();
  const dockBox = await controls.dock.boundingBox();
  expect(noticeBox.y + noticeBox.height).toBeLessThan(dockBox.y - 8);
  await page.screenshot({ path: testInfo.outputPath('mobile-notice.png') });
  await page.clock.fastForward(7000);
  await expect(notice).toBeVisible();
  await controls.action.click();
  await page.clock.fastForward(2000);
  await expect(notice).toBeVisible();
  await page.clock.fastForward(6100);
  await expect(notice).toBeHidden();
});

test('the create-room form assigns its suggested host name only on creation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create Room/ }).click();
  const nameField = page.getByLabel('Host name (organizer)');
  await expect(nameField).toHaveValue('');
  const suggestedName = await nameField.getAttribute('placeholder');
  expect(RANDOM_HOST_NAMES).toContain(suggestedName);

  await expect(page.locator('.bp-flow__main > .bp-flow__bottom-nav')).toBeVisible();

  const capacity = page.locator('.bp-capacity-summary');
  await expect(capacity).toContainText('Player limit3');
  await expect(capacity).toContainText('Host roleSpectator');
  await expect(capacity).toContainText('Mining slots3');

  const hostPlays = page.getByLabel('I also play as a miner');
  await hostPlays.check();
  await expect(capacity).toContainText('Host roleMiner');
  await expect(capacity).toContainText('Mining slots3');
  await hostPlays.uncheck();

  await page.getByRole('button', { name: 'Create Room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
  await expect(page.locator('.bp-host-dash__host-name')).toHaveText(suggestedName);
  await expect(page.locator('.bp-host-dash .bp-capacity-summary')).toContainText('Host roleSpectator');
  await expect(page.locator('.bp-host-dash .bp-capacity-summary')).toContainText('Mining slots3');
});

test('a host can return to the menu and securely resume the room', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create Room/ }).click();
  await page.getByLabel('Host name (organizer)').fill('Returning Host');
  await page.getByRole('button', { name: 'Create Room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
  const code = (await page.locator('.bp-room-invite__code').first().textContent()).trim();

  await page.getByRole('button', { name: 'Back to menu' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('You can resume this session');
  await dialog.getByRole('button', { name: 'Back to menu' }).click();

  const resumeRoom = page.getByRole('button', { name: 'Resume room' });
  const joinRoom = page.getByRole('button', { name: /Join Room/ });
  await expect(resumeRoom).toBeVisible();
  await expect(resumeRoom).toContainText(code);
  const [joinBox, resumeBox] = await Promise.all([joinRoom.boundingBox(), resumeRoom.boundingBox()]);
  expect(resumeBox.y).toBeGreaterThanOrEqual(joinBox.y + joinBox.height - 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bp-room-session-v5')));
  expect(saved).toMatchObject({ seed: code, role: 'host' });
  expect(saved.sessionToken).toBeTruthy();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume room' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Resume room' }).click();
  await expect(page.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
  await expect(page.locator('.bp-room-invite__code').first()).toHaveText(code);
});

test('a room code is easy to enter manually on another device', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create Room/ }).click();
  await page.getByRole('button', { name: 'Create Room', exact: true }).click();
  const code = (await page.locator('.bp-room-invite__code').first().textContent()).trim();
  expect(code).toMatch(/^[A-Z0-9]{10}$/);
  expect(code).not.toContain('-');

  const guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage();
    await guest.goto('/');
    await guest.getByRole('button', { name: /Join Room/ }).click();
    const codeInput = guest.getByLabel('Room Code');
    await codeInput.fill(`${code.slice(0, 4).toLowerCase()} ${code.slice(4).toLowerCase()}`);
    await expect(codeInput).toHaveValue(code);
    await guest.getByRole('button', { name: 'Find room' }).click();
    await expect(guest.locator('.bp-room-invite__code').first()).toHaveText(code);
    await guest.getByLabel('Your name').fill('Manual Guest');
    await guest.getByRole('button', { name: 'Join Room', exact: true }).click();
    await expect(guest.getByText('1 of 3 miners joined')).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

test('a spectator host does not occupy a player slot', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create Room/ }).click();
  await page.getByLabel('Host name (organizer)').fill('Spectator');
  await page.getByRole('button', { name: 'Create Room', exact: true }).click();

  const qrButton = page.getByRole('button', { name: 'Open a larger QR code' });
  await expect(qrButton).toBeVisible();
  await expect(page.locator('.bp-room-invite--featured')).toBeVisible();
  const codeBox = await page.locator('.bp-room-invite--featured .bp-room-invite__code-block').boundingBox();
  const qrBox = await qrButton.boundingBox();
  expect(qrBox.y).toBeGreaterThan(codeBox.y + codeBox.height - 2);
  await qrButton.click();
  await expect(page.getByRole('dialog').locator('.bp-qr-dialog__image')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await expect(page.getByText('0 of 3 miners joined')).toBeVisible();
  const code = (await page.locator('.bp-room-invite__code').first().textContent()).trim();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/?join=${encodeURIComponent(code)}`);
  await expect(guest.getByText('0 of 3 miners joined')).toBeVisible();
  await guest.getByLabel('Your name').fill('Student');
  await guest.getByRole('button', { name: 'Join Room', exact: true }).click();
  await expect(guest.getByText('1 of 3 miners joined')).toBeVisible();
  const hostRow = guest.locator('.bp-player-list__item').filter({ hasText: 'Spectator' });
  await expect(hostRow).toContainText('Host · spectator');
  await expect(page.getByText('Student', { exact: true })).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) >= 900) {
    const dashboardBox = await page.locator('.bp-host-dash').boundingBox();
    const overviewBox = await page.locator('.bp-host-dash__overview').boundingBox();
    expect(overviewBox.width).toBeGreaterThanOrEqual(dashboardBox.width * 0.95);
  }

  await guestContext.close();
});

test('a finished race shows the final standings before offering the menu', async ({ page, request }) => {
  const createdResponse = await request.post('/api/room?action=create', {
    data: {
      hostName: 'Observer',
      hostParticipates: false,
      numPlayers: 2,
      difficulty: 'easy',
      blocksToWin: 1,
    },
  });
  expect(createdResponse.ok()).toBe(true);
  const created = await createdResponse.json();

  const joinedResponse = await request.post('/api/room?action=join', {
    data: { seed: created.seed, playerName: 'Student' },
  });
  expect(joinedResponse.ok()).toBe(true);
  const joined = await joinedResponse.json();

  const startedResponse = await request.post('/api/room?action=start', {
    data: { seed: created.seed },
    headers: { Authorization: `Bearer ${created.sessionToken}` },
  });
  expect(startedResponse.ok()).toBe(true);

  await page.addInitScript(({ seed, sessionToken }) => {
    localStorage.setItem('bp-room-session-v5', JSON.stringify({
      seed,
      sessionToken,
      role: 'player',
      displayName: 'Student',
      hostParticipates: false,
    }));
  }, { seed: created.seed, sessionToken: joined.sessionToken });
  await page.goto('/');
  await expect(page.getByText('Mempool', { exact: true }).first()).toBeVisible();

  const proof = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('bp-room-session-v5'));
    const response = await fetch(`/api/room?action=status&seed=${encodeURIComponent(session.seed)}`, {
      headers: { Authorization: `Bearer ${session.sessionToken}` },
    });
    const { playerState } = await response.json();
    const selection = await import('/src/lib/txSelection.js');
    const easy = await import('/src/lib/easyMining.js');
    const optimal = selection.getValidBlockSelections(playerState.mempool, playerState.balances)
      .sort((a, b) => b.totalFees - a.totalFees)[0];
    const txs = selection.getTransactionsInSelectionOrder(playerState.mempool, optimal.ids);
    return {
      indexes: optimal.ids.map((id) => playerState.mempool.findIndex((tx) => tx.id === id)),
      nonce: playerState.target - playerState.prevTarget - easy.computeBlockValue(txs),
    };
  });
  await clickMempoolRows(page, proof.indexes);
  const controls = await visibleMiningControls(page, 'Mine block');
  await controls.nonceInput.fill(String(proof.nonce));
  await controls.action.click();

  await expect(page.getByRole('heading', { name: 'Race finished' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible();
  await expect(page.locator('.bp-results-board__row').first()).toContainText('Student');
  await expect(page.getByRole('button', { name: 'Main Menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View full results' })).toHaveCount(0);
});

for (const difficulty of ['Easy', 'Hard']) {
  test(`${difficulty} room supports two browsers and authenticated reload`, async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    await host.goto('/');
    await host.getByRole('button', { name: /Create Room/ }).click();
    await host.getByLabel('Host name (organizer)').fill('Teacher');
    await host.getByLabel('I also play as a miner').check();
    if (difficulty === 'Hard') await host.getByRole('radio', { name: /Hard/ }).click();
    await host.getByRole('button', { name: 'Create Room', exact: true }).click();
    await expect(host.getByRole('heading', { name: 'Host dashboard' })).toBeVisible();
    await expect(host.locator('.bp-room-invite--featured')).toBeVisible();
    await expect(host.locator('.bp-host-dash .bp-capacity-summary')).toContainText('Host roleMiner');
    const code = (await host.locator('.bp-room-invite__code').first().textContent()).trim();

    await guest.goto(`/?join=${encodeURIComponent(code)}`);
    await guest.getByLabel('Your name').fill('Student');
    await guest.getByRole('button', { name: 'Join Room', exact: true }).click();
    await expect(host.getByText('Student', { exact: true })).toBeVisible();

    await host.getByRole('button', { name: 'Start Game', exact: true }).click();
    await expect(guest.getByText('Mempool', { exact: true }).first()).toBeVisible();
    const gameSizes = await guest.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(gameSizes.scroll).toBeLessThanOrEqual(gameSizes.width + 1);
    await guest.reload();
    await expect(guest.getByText('Mempool', { exact: true }).first()).toBeVisible();

    const privateState = await guest.evaluate(async () => {
      const saved = JSON.parse(localStorage.getItem('bp-room-session-v5'));
      const response = await fetch(`/api/room?action=status&seed=${encodeURIComponent(saved.seed)}`, {
        headers: { Authorization: `Bearer ${saved.sessionToken}` },
      });
      return response.json();
    });
    expect(privateState.playerState.blockNum).toBe(1);
    expect(JSON.stringify(privateState.room)).not.toContain('tokenHash');

    await hostContext.close();
    await guestContext.close();
  });
}

async function visibleMiningControls(page, actionName = '') {
  const dock = page.locator('.bp-mobile-mining-dock');
  const mobile = await dock.isVisible();
  return {
    mobile,
    dock,
    nonceInput: mobile
      ? dock.locator('.bp-mobile-mining-dock__input')
      : page.locator('#nonce-easy'),
    action: mobile
      ? actionName
        ? dock.getByRole('button', { name: actionName, exact: true })
        : dock.locator('.bp-mobile-mining-dock__button').first()
      : actionName
        ? page.locator('.bp-panel--mining-action').getByRole('button', { name: actionName, exact: true })
        : page.locator('.bp-panel--mining-action').getByRole('button').first(),
  };
}
