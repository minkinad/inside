import {
  PrismaClient,
  CareerKind,
  PostCategory,
  CelebrationKind,
  Role,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Client as MinioClient } from 'minio';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import net from 'node:net';

if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seed is disabled in production');
const db = new PrismaClient();
const date = (days: number) => new Date(Date.now() + days * 86400000);
const nextBirthday = (month: number, day: number) => {
  const now = new Date();
  const year = now.getFullYear();
  const result = new Date(year, month - 1, day, 12);
  if (result < now) result.setFullYear(year + 1);
  return result;
};

async function main() {
  const existing = await Promise.all([
    db.unit.count(),
    db.employee.count(),
    db.post.count(),
    db.event.count(),
    db.benefit.count(),
    db.brandAsset.count(),
  ]);
  if (existing.some((count) => count > 0))
    throw new Error(
      'Demo seed requires an empty database. Existing data was not changed.',
    );

  const company = await db.unit.create({
    data: {
      name: 'min.Inside',
      description: 'Команда, которая делает цифровые продукты для людей',
    },
  });
  const product = await db.unit.create({
    data: {
      name: 'Продукт',
      parentId: company.id,
      description: 'Исследования, дизайн и развитие продукта',
    },
  });
  const tech = await db.unit.create({
    data: {
      name: 'Технологии',
      parentId: company.id,
      description: 'Разработка и инженерные практики',
    },
  });
  const people = await db.unit.create({
    data: {
      name: 'Люди и культура',
      parentId: company.id,
      description: 'Развитие и забота о команде',
    },
  });
  const marketing = await db.unit.create({
    data: { name: 'Бренд и коммуникации', parentId: company.id },
  });
  const units = { product, tech, people, marketing };
  const pass = await bcrypt.hash('Inside2026!', 12);
  const entries = [
    [
      'alex',
      'Александр Волков',
      'Продуктовый дизайнер',
      'product',
      'Дизайн продукта',
      'Москва',
      'Создаю простые сценарии для сложных задач. Люблю типографику и городские прогулки.',
      ['Figma', 'UX-исследования', 'Дизайн-системы'],
      ['фотография', 'бег'],
      -830,
      11,
      18,
    ],
    [
      'maria',
      'Мария Соколова',
      'Руководитель People & Culture',
      'people',
      'People Experience',
      'Москва',
      'Помогаю людям находить своё место и расти вместе с min.Inside.',
      ['HR', 'Культура', 'Фасилитация'],
      ['книги', 'йога'],
      -1450,
      5,
      23,
    ],
    [
      'daria',
      'Дарья Орлова',
      'Директор по продукту',
      'product',
      'Стратегия',
      'Санкт-Петербург',
      'Соединяю потребности людей и возможности технологий.',
      ['Стратегия', 'Product Management'],
      ['путешествия'],
      -1700,
      8,
      7,
    ],
    [
      'nikita',
      'Никита Морозов',
      'Frontend-инженер',
      'tech',
      'Платформа',
      'Москва',
      'Делаю быстрые и доступные интерфейсы.',
      ['React', 'TypeScript', 'Accessibility'],
      ['велосипед'],
      -371,
      4,
      12,
    ],
    [
      'polina',
      'Полина Миронова',
      'Бренд-дизайнер',
      'marketing',
      'Бренд',
      'Казань',
      'Рассказываю истории через визуальный язык.',
      ['Брендинг', 'Иллюстрация'],
      ['керамика'],
      -250,
      9,
      30,
    ],
    [
      'ivan',
      'Иван Кузнецов',
      'Технический директор',
      'tech',
      'Инженерия',
      'Москва',
      'Строю системы, которым можно доверять.',
      ['Архитектура', 'Backend', 'Менторство'],
      ['шахматы'],
      -1800,
      2,
      14,
    ],
    [
      'sofia',
      'София Белова',
      'Исследователь продукта',
      'product',
      'Исследования',
      'Удалённо',
      'Слушаю пользователей и превращаю наблюдения в решения.',
      ['Интервью', 'Аналитика'],
      ['театр'],
      -70,
      7,
      2,
    ],
    [
      'timur',
      'Тимур Алиев',
      'Backend-инженер',
      'tech',
      'Платформа',
      'Екатеринбург',
      'Люблю надёжные API и ясную документацию.',
      ['NestJS', 'PostgreSQL'],
      ['горные походы'],
      -31,
      12,
      1,
    ],
    [
      'elena',
      'Елена Новикова',
      'Комьюнити-менеджер',
      'people',
      'People Experience',
      'Москва',
      'Помогаю коллегам знакомиться и обмениваться идеями.',
      ['Коммуникации', 'События'],
      ['музыка'],
      -390,
      10,
      27,
    ],
    [
      'maxim',
      'Максим Петров',
      'Маркетинг-лид',
      'marketing',
      'Коммуникации',
      'Санкт-Петербург',
      'Развиваю голос бренда min.Inside.',
      ['Маркетинг', 'Контент'],
      ['кино'],
      -900,
      3,
      9,
    ],
  ] as const;
  const peopleByKey: Record<string, string> = {};
  for (const [
    key,
    name,
    title,
    unit,
    team,
    location,
    bio,
    skills,
    interests,
    joined,
    birthdayMonth,
    birthdayDay,
  ] of entries) {
    const employee = await db.employee.create({
      data: {
        email: `${key}@min.ex`,
        passwordHash: pass,
        role: key === 'maria' ? Role.ADMIN : Role.EMPLOYEE,
        name,
        title,
        unitId: units[unit].id,
        team,
        location,
        bio,
        skills: [...skills],
        interests: [...interests],
        joinedAt: date(joined),
        birthdayMonth,
        birthdayDay,
      },
    });
    peopleByKey[key] = employee.id;
    await db.careerEvent.create({
      data: {
        employeeId: employee.id,
        kind: CareerKind.JOINED,
        title: 'Присоединился к min.Inside',
        date: date(joined),
      },
    });
  }
  for (const key of ['alex', 'nikita', 'sofia'])
    await db.employee.update({
      where: { id: peopleByKey[key] },
      data: { managerId: peopleByKey[key === 'nikita' ? 'ivan' : 'daria'] },
    });
  await db.careerEvent.createMany({
    data: [
      {
        employeeId: peopleByKey.alex,
        kind: CareerKind.PROMOTION,
        title: 'Продуктовый дизайнер',
        detail: 'Развитие дизайн-системы',
        date: date(-250),
      },
      {
        employeeId: peopleByKey.maria,
        kind: CareerKind.AWARD,
        title: 'Человек года',
        detail: 'За развитие культуры взаимной поддержки',
        date: date(-160),
      },
      {
        employeeId: peopleByKey.nikita,
        kind: CareerKind.TRANSFER,
        title: 'Команда платформы',
        date: date(-120),
      },
    ],
  });
  await db.post.createMany({
    data: [
      {
        authorId: peopleByKey.daria,
        category: PostCategory.NEWS,
        title: 'Встречайте новый min.Inside',
        body: 'Теперь всё важное о жизни min.Inside — в одном месте. Здесь будут новости, идеи, события и истории коллег. Расскажите, что вам хотелось бы видеть первым!',
        pinned: true,
      },
      {
        authorId: peopleByKey.elena,
        category: PostCategory.EVENT,
        title: 'Пятничный завтрак: знакомимся ближе',
        body: 'В эту пятницу собираемся в московском офисе и онлайн. Возьмите любимый напиток и приготовьте один необычный факт о себе.',
      },
      {
        authorId: peopleByKey.polina,
        category: PostCategory.IDEA,
        title: 'Какой должна быть наша библиотека вдохновения?',
        body: 'Собираю идеи для новой подборки материалов. Поделитесь статьями, книгами и лекциями, которые вам помогли в работе.',
      },
      {
        authorId: peopleByKey.nikita,
        category: PostCategory.ACHIEVEMENT,
        title: 'Наш продукт стал заметно быстрее',
        body: 'Команда платформы сократила время загрузки ключевых экранов. Спасибо всем, кто тестировал и присылал обратную связь!',
      },
    ],
  });
  await db.event.createMany({
    data: [
      {
        title: 'min.Inside Talks: дизайн для всех',
        description: 'Открытый разговор о доступности цифровых продуктов.',
        startsAt: date(3),
        endsAt: date(3.08),
        location: 'Москва · онлайн',
      },
      {
        title: 'Книжный клуб',
        description: 'Обсуждаем идеи из книги месяца.',
        startsAt: date(8),
        endsAt: date(8.08),
        location: 'Онлайн',
      },
    ],
  });
  await db.celebration.createMany({
    data: [
      {
        employeeId: peopleByKey.sofia,
        kind: CelebrationKind.NEW_JOINER,
        title: 'Добро пожаловать в команду!',
        date: date(-2),
      },
      {
        employeeId: peopleByKey.maria,
        kind: CelebrationKind.ACHIEVEMENT,
        title: 'Награда за культуру поддержки',
        date: date(-3),
      },
      {
        employeeId: peopleByKey.elena,
        kind: CelebrationKind.BIRTHDAY,
        title: 'С днём рождения, Елена!',
        date: nextBirthday(10, 27),
      },
      {
        employeeId: peopleByKey.nikita,
        kind: CelebrationKind.ANNIVERSARY,
        title: 'Год вместе с min.Inside',
        date: date(-6),
      },
    ],
  });
  await db.benefit.createMany({
    data: [
      {
        category: 'Здоровье',
        title: 'Забота о здоровье',
        description:
          'Демонстрационная программа компенсации профилактических услуг.',
        eligibility: 'Для всех сотрудников',
        instruction: 'Обратитесь к команде People & Culture.',
        contact: 'people@min.ex',
      },
      {
        category: 'Образование',
        title: 'Бюджет на обучение',
        description:
          'Демонстрационная программа для курсов, книг и профессиональных конференций.',
        eligibility: 'После испытательного срока',
        instruction:
          'Согласуйте план развития с руководителем и напишите в People & Culture.',
        contact: 'people@min.ex',
      },
      {
        category: 'Спорт',
        title: 'Движение каждый день',
        description: 'Демонстрационная компенсация спортивных занятий.',
        eligibility: 'Для всех сотрудников',
        instruction: 'Отправьте запрос команде People & Culture.',
        contact: 'people@min.ex',
      },
      {
        category: 'Отдых',
        title: 'Дополнительный день',
        description: 'Демонстрационный день для восстановления и личных дел.',
        eligibility: 'Для всех сотрудников',
        instruction: 'Согласуйте дату с руководителем.',
        contact: 'people@min.ex',
      },
    ],
  });
  const minioPort = Number(process.env.MINIO_PORT || 9000);
  const minioHost = process.env.MINIO_ENDPOINT || 'localhost';
  const storageReady = await new Promise<boolean>((resolve) => {
    const socket = net.connect(minioPort, minioHost);
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
  if (storageReady) {
    const minio = new MinioClient({
      endPoint: minioHost,
      port: minioPort,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'inside',
      secretKey: process.env.MINIO_SECRET_KEY || 'inside-local-secret',
    });
    const bucket = process.env.MINIO_BUCKET || 'inside-assets';
    if (!(await minio.bucketExists(bucket))) await minio.makeBucket(bucket);
    for (const item of [
      {
        file: 'min-inside-mark.webp',
        mimeType: 'image/webp',
        category: 'Логотипы',
        title: 'Логотип min.Inside',
        description: 'Основной знак и название компании на светлом фоне.',
        usage: 'Сохраняйте отступы вокруг знака; не меняйте пропорции.',
        version: '1.0',
      },
      {
        file: 'meeting-background.svg',
        mimeType: 'image/svg+xml',
        category: 'Видеозвонки',
        title: 'Фон для встреч',
        description: 'Фирменный фон для видеозвонков команды.',
        usage: 'Используйте на внутренних и внешних встречах.',
        version: '1.0',
      },
    ]) {
      const objectKey = `demo/${item.file}`;
      const file = await readFile(
        join(process.cwd(), 'prisma', 'seed-assets', item.file),
      );
      await minio.putObject(bucket, objectKey, file, file.length, {
        'Content-Type': item.mimeType,
      });
      await db.brandAsset.create({
        data: {
          category: item.category,
          title: item.title,
          description: item.description,
          usage: item.usage,
          version: item.version,
          objectKey,
          mimeType: item.mimeType,
          size: file.length,
        },
      });
    }
  } else
    console.log(
      'MinIO unavailable: demo brand files skipped. Start Docker Compose and rerun seed to add them.',
    );
  console.log(
    'Demo seed created. All people, programs and stories are fictional.',
  );
}
main().finally(() => db.$disconnect());
