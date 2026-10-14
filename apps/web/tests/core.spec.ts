import { test, expect } from '@playwright/test';

test('employee can enter, find a colleague and publish a discussion', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Рабочий email').fill('alex@min.ex');
  await page.getByLabel('Пароль').fill('Inside2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(
    page.getByRole('heading', { name: /Здравствуйте/ }),
  ).toBeVisible();
  await expect(page).toHaveTitle('min.Inside');
  await expect(
    page.getByRole('link', { name: 'min.Inside — на главную' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Продукты min' }).click();
  await expect(page.getByText('min:Ecosys')).toBeVisible();
  await expect(page.getByText('min:Dev')).toBeVisible();
  await expect(page.getByText('min:Infra')).toBeVisible();
  await expect(page.getByText('Скоро')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Продукты min' }),
  ).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Основная навигация' }),
  ).toBeVisible();
  await expect(page.locator('.rail')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть поиск' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Поиск по min.Inside' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  const forbidden = await page.request.post('/api/inside/admin/people', {
    headers: { Origin: 'http://localhost:3000' },
    data: {},
  });
  expect(forbidden.status()).toBe(403);
  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Поиск по min.Inside' }),
  ).toBeVisible();
  await page.getByPlaceholder('Люди, публикации, материалы...').fill('Мария');
  await expect(
    page.getByRole('button', { name: /Мария Соколова/ }),
  ).toBeVisible();
  await page.getByPlaceholder('Люди, публикации, материалы...').fill('Логотип');
  await expect(
    page.getByRole('button', { name: /Логотип min.Inside/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Люди', exact: true }).first().click();
  await page.getByLabel('Поиск сотрудников').fill('Мария');
  await expect(page.getByText('Мария Соколова').first()).toBeVisible();
  await page
    .getByRole('link', { name: /Мария Соколова/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/people\/employee\/[0-9]{11}$/);
  await expect(
    page.getByRole('heading', { name: 'Мария Соколова' }),
  ).toBeVisible();
  await expect(page.getByText(/^employee\/[0-9]{11}$/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Путь в min.Inside' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Сообщество', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Написать пост' }).click();
  const title = `Вопрос команде ${Date.now()}`;
  await page.getByPlaceholder('Заголовок').fill(title);
  await page
    .getByPlaceholder('О чём хотите рассказать?')
    .fill('Какие книги о совместной работе вам помогли?');
  await page.getByRole('button', { name: 'Жирный текст' }).click();
  await page.getByRole('button', { name: 'Предпросмотр' }).click();
  await expect(page.locator('.markdown-preview strong')).toHaveText(
    'жирный текст',
  );
  await page.getByRole('button', { name: 'Редактор' }).click();
  const postImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.getByLabel('Изображение').setInputFiles({
    name: 'post.png',
    mimeType: 'image/png',
    buffer: postImage,
  });
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.getByText(title).click();
  await expect(page).toHaveURL(/\/community\/[^/]+$/);
  await expect(page.getByAltText('Изображение публикации')).toBeVisible();
  await page
    .getByLabel('Комментарий')
    .fill('Спасибо за идею, обсудим на встрече!');
  await page.getByRole('button', { name: 'Отправить' }).click();
  await expect(
    page.getByText('Спасибо за идею, обсудим на встрече!'),
  ).toBeVisible();
});

test('admin can add an event and it appears in the calendar', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Рабочий email').fill('maria@min.ex');
  await page.getByLabel('Пароль').fill('Inside2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('link', { name: 'Управление' }).click();
  await expect(
    page.getByRole('heading', { name: 'Управление min.Inside' }),
  ).toBeVisible();
  const title = `Встреча команды ${Date.now()}`;
  const start = new Date(Date.now() + 86400000),
    end = new Date(Date.now() + 90000000);
  const local = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  await page.locator('[name="title"]').first().fill(title);
  await page
    .locator('form')
    .first()
    .locator('[name="description"]')
    .fill('Обсуждаем идеи и новости компании.');
  await page.locator('[name="startsAt"]').fill(local(start));
  await page.locator('[name="endsAt"]').fill(local(end));
  await page.locator('[name="location"]').first().fill('Онлайн');
  await page
    .locator('form')
    .first()
    .getByRole('button', { name: 'Добавить' })
    .click();
  await expect(page.getByText('Сохранено').first()).toBeVisible();
  await expect(page.getByText('create · Event').first()).toBeVisible();
  await page
    .getByRole('link', { name: 'События', exact: true })
    .first()
    .click();
  await expect(page.getByText(title)).toBeVisible();
});

test('employee can upload their own profile photo', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Рабочий email').fill('alex@min.ex');
  await page.getByLabel('Пароль').fill('Inside2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('link', { name: 'Настройки', exact: true }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .getByLabel('Фотография профиля')
    .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Загрузить фото' }).click();
  await expect(page.getByText('Фотография обновлена')).toBeVisible();
  await expect(page.getByAltText('Александр Волков').first()).toBeVisible();
});

test('mobile navigation and directory remain usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Рабочий email').fill('alex@min.ex');
  await page.getByLabel('Пароль').fill('Inside2026!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(
    page.getByRole('heading', { name: /Здравствуйте/ }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Поиск по min.Inside' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Поиск по min.Inside' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Поиск по min.Inside' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Все разделы' }).click();
  await expect(page.getByRole('region', { name: 'Все разделы' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Закрыть меню' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Все разделы' })).toBeFocused();
  await page.getByRole('button', { name: 'Все разделы' }).click();
  await page
    .getByRole('region', { name: 'Все разделы' })
    .getByRole('link', { name: 'Бонусы' })
    .click();
  await expect(page).toHaveURL(/\/benefits$/);
  await page.getByRole('button', { name: 'Все разделы' }).click();
  await page
    .getByRole('region', { name: 'Все разделы' })
    .getByRole('link', { name: 'Люди' })
    .click();
  await page.getByLabel('Поиск сотрудников').fill('Мария');
  await expect(page.getByText('Мария Соколова')).toBeVisible();
  await page.getByRole('button', { name: 'Карточки' }).click();
  await expect(page.locator('.directory-card')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Все разделы' }).click();
  await page
    .getByRole('region', { name: 'Все разделы' })
    .getByRole('link', { name: 'Сообщество' })
    .click();
  await page.getByRole('button', { name: 'Написать пост' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Новая публикация' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Написать пост' }),
  ).toBeFocused();
});
