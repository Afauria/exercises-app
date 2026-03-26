import { test, expect } from '@playwright/test';

test.describe('题库应用功能验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('练习', { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test('底栏四个 Tab：练习 / 考试 / 错题 / 统计，且无「设置」', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.filter({ hasText: '练习' }).first()).toBeVisible();
    await expect(tabs.filter({ hasText: '考试' }).first()).toBeVisible();
    await expect(tabs.filter({ hasText: '错题' }).first()).toBeVisible();
    await expect(tabs.filter({ hasText: '统计' }).first()).toBeVisible();
    await expect(tabs.filter({ hasText: '设置' })).toHaveCount(0);
  });

  test('练习页：搜索框占位与随机一节', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索题号或题干')).toBeVisible();
    await expect(page.getByText('随机一节')).toBeVisible();
  });

  test('顶栏：眼睛、自动下一题与垃圾箱', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /显示全部题目答案|隐藏全部题目答案/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /答对自动下一题/ })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /清空或导入题库/ })).toBeVisible();
  });

  test('考试 Tab：选节与进入考试', async ({ page }) => {
    await page.locator('[role="tab"]').filter({ hasText: '考试' }).first().click();
    await expect(page.getByText('1. 选择一节')).toBeVisible();
    await expect(page.getByText('2. 本场设置')).toBeVisible();
    await expect(page.getByText('进入考试')).toBeVisible();
  });

  test('错题 Tab：分段与空态或列表', async ({ page }) => {
    await page.locator('[role="tab"]').filter({ hasText: '错题' }).first().click();
    await expect(page.getByText('需要巩固的题目')).toBeVisible();
    await expect(page.getByText('收藏', { exact: true }).first()).toBeVisible();
    const emptyOrCard = page.getByText(/错题本是空的|还没有收藏|需要巩固|第 \d+ 题/);
    await expect(emptyOrCard.first()).toBeVisible({ timeout: 15_000 });
  });

  test('统计 Tab：正确率与指标卡', async ({ page }) => {
    await page.locator('[role="tab"]').filter({ hasText: '统计' }).first().click();
    await expect(page.getByText('练习正确率')).toBeVisible();
    await expect(page.getByText('题库总量')).toBeVisible();
    await expect(page.getByText('近 30 日节奏')).toBeVisible();
    await expect(page.getByText('考试记录')).toBeVisible();
  });

  test('数据菜单可打开并含清空与导入选项', async ({ page }) => {
    await page.getByRole('button', { name: /清空或导入题库/ }).click();
    await expect(page.getByText('数据与题库')).toBeVisible();
    await expect(page.getByText('清空全部数据')).toBeVisible();
    await expect(page.getByText('导入内置题库')).toBeVisible();
    await expect(page.getByText('导入本地 TXT')).toBeVisible();
    await page.getByText('关闭').click();
  });

  test('全局「眼睛」切换后练习页仍可交互', async ({ page }) => {
    const eye = page.getByRole('button', { name: /显示全部题目答案|隐藏全部题目答案/ });
    await eye.click();
    await eye.click();
    await expect(page.getByPlaceholder('搜索题号或题干')).toBeVisible();
  });

  test('清空全部数据后内置题库分节仍在', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', async (d) => {
      dialogs += 1;
      await d.accept();
    });
    await page.getByRole('button', { name: /清空或导入题库/ }).click();
    await page.getByText('清空全部数据').click();
    await expect.poll(() => dialogs, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('第 1 节').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/共 \d+ 题/)).toBeVisible();
  });
});
