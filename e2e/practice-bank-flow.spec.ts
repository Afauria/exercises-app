import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 420_000 });

async function waitForPracticeListLoaded(page: Page) {
  await expect(page.getByTestId('practice-home-list-loaded')).toBeAttached({ timeout: 300_000 });
}

/** 等待首页拉取完成；若无题库则通过面板导入内置题并切 Tab 触发刷新 */
async function waitForBankReady(page: Page) {
  await waitForPracticeListLoaded(page);

  const line = page.getByText(/共 \d+ 题/);
  if (await line.isVisible().catch(() => false)) {
    await expect(page.getByText('第 1 节').first()).toBeVisible({ timeout: 30_000 });
    return;
  }

  page.once('dialog', (d) => void d.accept());

  await page.getByRole('button', { name: /清空或导入题库/ }).click();
  await page.getByText('导入内置题库').click();

  await Promise.race([
    page.getByText(/导入完成|导入失败/).waitFor({ state: 'visible', timeout: 300_000 }),
    expect(page.getByText('数据与题库')).toBeHidden({ timeout: 300_000 }),
  ]);
  await page.getByText('确定').click({ timeout: 10_000 }).catch(() => {});
  await page.getByText('关闭').click({ timeout: 5000 }).catch(() => {});

  await page.locator('[role="tab"]').filter({ hasText: '考试' }).first().click();
  await page.locator('[role="tab"]').filter({ hasText: '练习' }).first().click();

  await waitForPracticeListLoaded(page);
  await expect(line).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('第 1 节').first()).toBeVisible({ timeout: 30_000 });
}

async function waitForQuizLoaded(page: Page) {
  await expect(page.getByText('载入本题组')).toBeHidden({ timeout: 120_000 });
  await expect(page.getByText(/\d+ \/ \d+/).first()).toBeVisible();
}

async function pickAnyAnswer(page: Page) {
  const byLetter = page.getByRole('button', { name: /^[A-E]\./ });
  if ((await byLetter.count()) > 0) {
    await byLetter.first().click();
    return;
  }
  const letterText = page.getByText(/^[A-E]\./).first();
  if (await letterText.isVisible().catch(() => false)) {
    await letterText.click();
    return;
  }
  const ok = page.getByRole('button', { name: '正确' });
  if (await ok.isVisible().catch(() => false)) {
    await ok.click();
    return;
  }
  await page.getByText('正确').first().click();
}

test.describe('题库加载与练习做题', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('练习', { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('题库加载后出现分节与题量', async ({ page }) => {
    await waitForBankReady(page);
    await expect(page.getByText('选择一节', { exact: true })).toBeVisible();
    await expect(page.getByText('随机一节')).toBeEnabled();
    await expect(page.getByPlaceholder('搜索题号或题干').first()).toBeVisible();
  });

  test('进入第 1 节：题目加载、选题、下一题', async ({ page }) => {
    await waitForBankReady(page);
    await page.getByText('第 1 节').first().click();
    await waitForQuizLoaded(page);

    await expect(page.getByText('1 / 50')).toBeVisible();
    await pickAnyAnswer(page);
    await page.getByRole('button', { name: '下一题' }).click();
    await expect(page.getByText('2 / 50')).toBeVisible();
  });

  test('返回后切换第 2 节：题号与进度重置', async ({ page }) => {
    await waitForBankReady(page);
    const sec2 = page.getByText('第 2 节');
    await expect(sec2.first()).toBeVisible();

    await page.getByText('第 1 节').first().click();
    await waitForQuizLoaded(page);
    await expect(page.getByText('1 / 50')).toBeVisible();
    await expect(page.getByText(/^1\./).first()).toBeVisible();

    await page.getByRole('button', { name: '返回练习列表' }).click();
    await expect(page.getByText('选择一节', { exact: true })).toBeVisible();

    await sec2.first().click();
    await waitForQuizLoaded(page);
    await expect(page.getByText('1 / 50')).toBeVisible();
    await expect(page.getByText(/^51\./).first()).toBeVisible();
  });
});
