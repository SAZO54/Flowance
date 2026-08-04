import {expect, test} from '@playwright/test'

test.describe.skip('Phase1 acceptance flow', () => {
  test('registers, logs in, and completes the core freelancer workflow', async ({
    page,
  }) => {
    await page.goto('/register')
    await expect(page).toHaveURL(/\/register/)

    // TODO: Enable after API test fixtures are available:
    // register -> login -> client -> project -> contract -> schedule generation
    // -> work record -> monthly settlement.
  })
})
