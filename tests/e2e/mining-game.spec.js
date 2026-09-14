import { expect, test } from '@playwright/test';

test('menu remains usable without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Block Mining Game/);
  await expect(page.getByRole('button', { name: /Play Solo/ })).toBeVisible();
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
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
      const saved = JSON.parse(localStorage.getItem('bp-room-session-v2'));
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
