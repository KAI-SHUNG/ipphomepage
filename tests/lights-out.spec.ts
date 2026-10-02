import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('embedded game flips independently, supports keyboard, hints, undo, reset and full completion', async ({ page }, info) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'I 图形卡片', exact: true });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (let click = 0; click < 5; click++) await trigger.click();
  const game = page.getByRole('dialog', { name: '点亮 I++' });
  await expect(game).toBeVisible();
  const panels = game.locator('.lo-panel');
  await expect(panels).toHaveCount(3);
  await expect(game.getByRole('button', { name: '全部重置', exact: true })).toHaveCount(0);
  expect(await game.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
  const cells = panels.first().locator('.lo-cell');
  await cells.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cells.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(panels.first().locator('.lo-cell[aria-pressed="true"]')).toHaveCount(4);
  await expect(panels.nth(1).locator('.lo-cell[aria-pressed="true"]')).toHaveCount(0);
  await panels.first().getByRole('button', { name: '撤销', exact: true }).click();
  await expect(panels.first().locator('.lo-cell[aria-pressed="true"]')).toHaveCount(0);
  await cells.nth(12).click();
  await panels.first().getByRole('button', { name: '重置', exact: true }).click();
  await expect(panels.first().locator('.lo-cell[aria-pressed="true"]')).toHaveCount(0);

  for (let panel = 0; panel < 3; panel++) {
    if (info.project.name === 'mobile') await game.locator('.lo-switcher button').nth(panel).click();
    const board = panels.nth(panel);
    for (let step = 0; step < 11; step++) {
      await board.getByRole('button', { name: '提示', exact: true }).click();
      await expect(board.locator('.lo-cell.is-hint')).toHaveCount(1);
      await board.locator('.lo-cell.is-hint').click();
    }
    await expect(board).toHaveAttribute('data-complete', 'true');
    const completeCell = board.locator('.lo-cell').first();
    await completeCell.focus();
    await expect(completeCell).toBeFocused(); // Completed boards remain keyboard discoverable.
    await expect(completeCell).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(game.locator('.lo-progress')).toContainText('I++ 已点亮');
  await expect(game.locator('.lo-progress')).toHaveAccessibleName('I++ 已点亮，共 33 步');
  await game.screenshot({ path: info.outputPath('lights-out-complete.png'), animations: 'disabled' });
  if (info.project.name === 'mobile') await game.locator('.lo-switcher button').first().click();
  await panels.first().getByRole('button', { name: '撤销', exact: true }).click();
  await expect(panels.first()).toHaveAttribute('data-complete', 'false');
  await expect(game.locator('.lo-progress')).not.toContainText('I++ 已点亮');
  for (let panel = 0; panel < 3; panel++) {
    if (info.project.name === 'mobile') await game.locator('.lo-switcher button').nth(panel).click();
    await panels.nth(panel).getByRole('button', { name: '重置', exact: true }).click();
  }
  if (info.project.name === 'mobile') await game.locator('.lo-switcher button').first().click();
  await expect(game.locator('.lo-cell[aria-pressed="true"]')).toHaveCount(0);
  await expect(game).toContainText('0 步');

  const bounds = await game.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const cellSize = await cells.first().boundingBox();
  expect(cellSize!.width).toBeGreaterThanOrEqual(info.project.name === 'mobile' ? 44 : 28);
  expect(cellSize!.height).toBeGreaterThanOrEqual(info.project.name === 'mobile' ? 44 : 28);
  const results = await new AxeBuilder({ page }).include('.lights-out').analyze();
  expect(results.violations).toEqual([]);
  await game.screenshot({ path: info.outputPath('lights-out.png'), animations: 'disabled' });
  await cells.first().click();
  await page.keyboard.press('Escape');
  await expect(game).not.toBeVisible();
  await expect(trigger).toBeFocused();
  for (let click = 0; click < 5; click++) await trigger.click();
  await expect(game.locator('.lo-cell[aria-pressed="true"]')).toHaveCount(3);
  await game.getByRole('button', { name: '关闭游戏', exact: true }).click();
  await expect(game).not.toBeVisible();
});

test('game adapts to dark theme and reduced motion without losing progress', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: '切换深色模式' }).click();
  const triggers = page.locator('.hero-art button');
  for (let click = 0; click < 5; click++) await triggers.nth(click % 3).click();
  const game = page.getByRole('dialog', { name: '点亮 I++' });
  const cell = game.locator('.lo-cell').first();
  await cell.click();
  await expect(game.locator('.lo-cell[aria-pressed="true"]')).toHaveCount(3);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(game.locator('.lo-cell[aria-pressed="true"]')).toHaveCount(3);
  expect(await cell.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThanOrEqual(0.00001);
  const results = await new AxeBuilder({ page }).include('.lights-out').analyze();
  expect(results.violations).toEqual([]);
  await game.screenshot({ path: info.outputPath('lights-out-dark.png'), animations: 'disabled' });
});

test('ordinary clicks expire and the modal fits narrow and intermediate viewports', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The viewport matrix is checked once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'I 图形卡片', exact: true });
  for (let click = 0; click < 3; click++) await trigger.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(4001);
  for (let click = 0; click < 4; click++) await trigger.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await trigger.click();
  const game = page.getByRole('dialog', { name: '点亮 I++' });
  await expect(game).toBeVisible();
  await page.clock.resume();
  for (const [width, height] of [[320, 568], [393, 740], [768, 600], [900, 600], [1024, 600], [1440, 720]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => game.evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return {
        horizontal: el.scrollWidth <= el.clientWidth,
        vertical: el.scrollHeight <= el.clientHeight,
        inViewport: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight
      };
    }), { message: `${width}×${height} viewport` }).toEqual({ horizontal: true, vertical: true, inViewport: true });
    const cells = await game.locator('.lo-cell').first().boundingBox();
    expect(cells!.width).toBeGreaterThanOrEqual(width <= 740 ? 44 : 28);
  }
});

test('discovery counts any five clicks in a rolling four-second window', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Clock behavior is checked once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'I 图形卡片', exact: true });
  await trigger.click();
  await page.clock.runFor(2000);
  await trigger.click();
  await page.clock.runFor(1000);
  await trigger.click();
  await page.clock.runFor(1100);
  await trigger.click();
  await page.clock.runFor(100);
  await trigger.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(100);
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '点亮 I++' })).toBeVisible();
});

test('keyboard discovery traps focus, dismisses on backdrop and returns to each opener', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const triggers = page.locator('.hero-art button');
  const game = page.getByRole('dialog', { name: '点亮 I++' });
  for (let index = 0; index < 3; index++) {
    const opener = triggers.nth(index);
    await opener.focus();
    for (let click = 0; click < 5; click++) await page.keyboard.press('Enter');
    await expect(game).toBeVisible();
    const lastControl = game.locator('.lo-panel:visible').last().getByRole('button', { name: '提示', exact: true });
    await lastControl.focus();
    await page.keyboard.press('Tab');
    await expect(game.getByRole('button', { name: '关闭游戏', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastControl).toBeFocused();
    await page.mouse.click(3, 3);
    await expect(game).not.toBeVisible();
    await expect(opener).toBeFocused();
  }
});
