import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaClient, PostCategory, Role, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import { z, ZodError } from 'zod';
import type { Response } from 'express';
import {
  AuthGuard,
  AdminGuard,
  CurrentUser,
  type Principal,
  tokenFor,
} from './security';

const clean = (s: string) => s.replace(/<[^>]*>/g, '').trim();
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (e) {
    if (e instanceof ZodError)
      throw new BadRequestException(
        e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    throw e;
  }
}
const text = (max: number) =>
  z.string().trim().min(1).max(max).transform(clean).refine(Boolean);
const url = z.url().refine((v) => v.startsWith('https://'));
const pageArgs = (q: { skip?: string; take?: string }) => ({
  skip: Math.max(0, Number(q.skip) || 0),
  take: Math.min(40, Math.max(1, Number(q.take) || 12)),
});
const employeeNumber = z.string().regex(/^[0-9]{11}$/);
const employeePublicId = (number: string) =>
  `employee/${parse(employeeNumber, number)}`;
const personSelect = {
  publicId: true,
  name: true,
  title: true,
  team: true,
  location: true,
  avatarUrl: true,
  joinedAt: true,
  unit: { select: { id: true, name: true } },
} as const;
const postInclude = {
  author: { select: personSelect },
  _count: { select: { comments: true, reactions: true } },
} as const;
const postOmit = { authorId: true } as const;

@Injectable()
export class ApiService {
  readonly redis: Redis;
  readonly minio: MinioClient;
  readonly bucket: string;
  constructor(@Inject(PrismaClient) readonly db: PrismaClient) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.bucket = process.env.MINIO_BUCKET || 'inside-assets';
    this.minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'inside',
      secretKey: process.env.MINIO_SECRET_KEY || 'inside-local-secret',
    });
  }
  async throttle(key: string, limit = 5, seconds = 60, strict = false) {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const n = Number(
        await this.redis.eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
          1,
          key,
          seconds,
        ),
      );
      if (n > limit)
        throw new BadRequestException(
          'Слишком много запросов. Попробуйте позже.',
        );
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      if (strict)
        throw new ServiceUnavailableException('Вход временно недоступен');
      // Social writes remain available during a Redis outage; login fails closed.
    }
  }
  auditedWrite<T>(
    actorId: string,
    action: string,
    entity: string,
    write: (tx: Prisma.TransactionClient) => Promise<T>,
    entityId: (result: T) => string,
    details?: object,
  ) {
    return this.db.$transaction(async (tx) => {
      const result = await write(tx);
      await tx.auditEntry.create({
        data: { actorId, action, entity, entityId: entityId(result), details },
      });
      return result;
    });
  }
  async bucketReady() {
    if (!(await this.minio.bucketExists(this.bucket)))
      await this.minio.makeBucket(this.bucket);
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(ApiService) private readonly s: ApiService) {}
  @Post('login')
  async login(@Body() body: unknown) {
    const input = parse(
      z.object({ email: z.email(), password: z.string().min(1) }),
      body,
    );
    const email = input.email.toLowerCase();
    await this.s.throttle(`login:${email}`, 8, 300, true);
    const user = await this.s.db.employee.findUnique({
      where: { email },
      select: {
        id: true,
        publicId: true,
        email: true,
        passwordHash: true,
        role: true,
        name: true,
        title: true,
        avatarUrl: true,
      },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw new BadRequestException('Неверный email или пароль');
    const { id: _, passwordHash: __, ...safe } = user;
    return { token: tokenFor({ id: user.id, role: user.role }), user: safe };
  }
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: Principal) {
    return this.s.db.employee.findUnique({
      where: { id: user.id },
      select: {
        ...personSelect,
        email: true,
        role: true,
        bio: true,
        showBirthday: true,
        publicCelebrations: true,
      },
    });
  }
  @Patch('me/preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  preferences(@CurrentUser() user: Principal, @Body() body: unknown) {
    const data = parse(
      z.object({
        showBirthday: z.boolean().optional(),
        publicCelebrations: z.boolean().optional(),
      }),
      body,
    );
    return this.s.db.employee.update({
      where: { id: user.id },
      data,
      select: { publicId: true, showBirthday: true, publicCelebrations: true },
    });
  }
  @Patch('me/password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async password(@CurrentUser() user: Principal, @Body() body: unknown) {
    const data = parse(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12).max(128),
      }),
      body,
    );
    const employee = await this.s.db.employee.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!(await bcrypt.compare(data.currentPassword, employee.passwordHash)))
      throw new BadRequestException('Текущий пароль неверен');
    await this.s.db.employee.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
    });
    return { ok: true };
  }
  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async avatar(
    @CurrentUser() user: Principal,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !['image/png', 'image/jpeg'].includes(file.mimetype))
      throw new BadRequestException('Выберите PNG или JPEG до 5 МБ');
    const b = file.buffer;
    const valid =
      file.mimetype === 'image/png'
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : b[0] === 255 && b[1] === 216;
    if (!valid)
      throw new BadRequestException('Содержимое файла не соответствует типу');
    await this.s.bucketReady();
    await this.s.minio.putObject(
      this.s.bucket,
      `avatars/${user.id}`,
      b,
      b.length,
      { 'Content-Type': file.mimetype },
    );
    const employee = await this.s.db.employee.findUniqueOrThrow({
      where: { id: user.id },
      select: { publicId: true },
    });
    return this.s.db.employee.update({
      where: { id: user.id },
      data: { avatarUrl: `/api/inside/people/${employee.publicId}/avatar` },
      select: { publicId: true, avatarUrl: true },
    });
  }
}

@ApiTags('inside')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class DataController {
  constructor(@Inject(ApiService) private readonly s: ApiService) {}
  @Get('home')
  async home(@CurrentUser() user: Principal) {
    const [me, posts, newPeople, events, birthdays, benefits] =
      await Promise.all([
        this.s.db.employee.findUniqueOrThrow({
          where: { id: user.id },
          select: { name: true, title: true, avatarUrl: true },
        }),
        this.s.db.post.findMany({
          where: { published: true },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 5,
          include: postInclude,
          omit: postOmit,
        }),
        this.s.db.employee.findMany({
          orderBy: { joinedAt: 'desc' },
          take: 4,
          select: personSelect,
        }),
        this.s.db.event.findMany({
          where: { startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 3,
        }),
        this.s.db.employee.findMany({
          where: {
            showBirthday: true,
            birthdayDay: { not: null },
            birthdayMonth: { not: null },
          },
          select: {
            publicId: true,
            name: true,
            title: true,
            avatarUrl: true,
            birthdayDay: true,
            birthdayMonth: true,
          },
        }),
        this.s.db.benefit.findMany({ where: { active: true }, take: 3 }),
      ]);
    const today = new Date();
    const upcoming = birthdays
      .flatMap((p) => {
        if (p.birthdayMonth === null || p.birthdayDay === null) return [];
        const nextYear =
          p.birthdayMonth < today.getMonth() + 1 ||
          (p.birthdayMonth === today.getMonth() + 1 &&
            p.birthdayDay < today.getDate());
        const date = new Date(
          today.getFullYear() + (nextYear ? 1 : 0),
          p.birthdayMonth - 1,
          p.birthdayDay,
        );
        const daysUntil =
          (date.getTime() -
            new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
            ).getTime()) /
          86400000;
        return [
          {
            ...p,
            birthdayMonth: p.birthdayMonth,
            birthdayDay: p.birthdayDay,
            daysUntil,
          },
        ];
      })
      .filter((p) => p.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);
    return {
      me,
      lead: posts[0] || null,
      posts: posts.slice(1),
      newPeople,
      events,
      birthdays: upcoming,
      benefits,
    };
  }
  @Get('people')
  async people(
    @Query() q: {
      search?: string;
      unitId?: string;
      team?: string;
      skip?: string;
      take?: string;
    },
  ) {
    const where = {
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { title: { contains: q.search, mode: 'insensitive' as const } },
              { team: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(q.unitId ? { unitId: q.unitId } : {}),
      ...(q.team ? { team: q.team } : {}),
    };
    const [items, total] = await Promise.all([
      this.s.db.employee.findMany({
        where,
        select: personSelect,
        orderBy: { name: 'asc' },
        ...pageArgs(q),
      }),
      this.s.db.employee.count({ where }),
    ]);
    return { items, total };
  }
  @Get('people/employee/:number')
  async person(@Param('number') number: string) {
    const p = await this.s.db.employee.findUnique({
      where: { publicId: employeePublicId(number) },
      select: {
        ...personSelect,
        email: true,
        phone: true,
        bio: true,
        interests: true,
        skills: true,
        coverUrl: true,
        manager: { select: personSelect },
        career: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            kind: true,
            title: true,
            detail: true,
            date: true,
          },
        },
        posts: {
          where: { published: true },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, category: true, createdAt: true },
        },
      },
    });
    if (!p) throw new NotFoundException();
    return p;
  }
  @Get('people/employee/:number/avatar')
  async avatar(@Param('number') number: string, @Res() res: Response) {
    const person = await this.s.db.employee.findUnique({
      where: { publicId: employeePublicId(number) },
      select: { id: true, avatarUrl: true },
    });
    if (!person?.avatarUrl) throw new NotFoundException();
    const key = `avatars/${person.id}`;
    const stat = await this.s.minio.statObject(this.s.bucket, key);
    const stream = await this.s.minio.getObject(this.s.bucket, key);
    res.setHeader(
      'Content-Type',
      stat.metaData['content-type'] || 'image/jpeg',
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res);
  }
  @Get('org')
  async org() {
    const [units, people] = await Promise.all([
      this.s.db.unit.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, parentId: true },
      }),
      this.s.db.employee.findMany({
        select: { ...personSelect, id: true, managerId: true, unitId: true },
      }),
    ]);
    const ids = new Map(people.map((p) => [p.id, p.publicId]));
    return {
      units,
      people: people.map(({ id, managerId, ...person }) => ({
        ...person,
        managerId: managerId ? ids.get(managerId) || null : null,
      })),
    };
  }
  @Get('posts')
  async posts(
    @Query() q: {
      category?: PostCategory;
      search?: string;
      skip?: string;
      take?: string;
    },
  ) {
    const where = {
      published: true,
      ...(q.category && Object.values(PostCategory).includes(q.category)
        ? { category: q.category }
        : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' as const } },
              { body: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.s.db.post.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        include: postInclude,
        omit: postOmit,
        ...pageArgs(q),
      }),
      this.s.db.post.count({ where }),
    ]);
    return { items, total };
  }
  @Get('posts/:id')
  async post(@Param('id') id: string) {
    const p = await this.s.db.post.findFirst({
      where: { id, published: true },
      include: {
        ...postInclude,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: personSelect } },
          omit: { authorId: true },
        },
      },
      omit: postOmit,
    });
    if (!p) throw new NotFoundException();
    return p;
  }
  @Get('posts/:id/image')
  async postImage(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const post = await this.s.db.post.findUnique({
      where: { id },
      select: { published: true, authorId: true, imageUrl: true },
    });
    if (
      !post?.imageUrl ||
      (!post.published && post.authorId !== user.id && user.role !== 'ADMIN')
    )
      throw new NotFoundException();
    const key = `posts/${id}`;
    const stat = await this.s.minio.statObject(this.s.bucket, key);
    const stream = await this.s.minio.getObject(this.s.bucket, key);
    res.setHeader(
      'Content-Type',
      stat.metaData['content-type'] || 'image/jpeg',
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res);
  }
  @Post('posts')
  async createPost(@CurrentUser() user: Principal, @Body() body: unknown) {
    await this.s.throttle(`post:${user.id}`, 5, 300);
    const data = parse(
      z.object({
        title: text(120),
        body: text(5000),
        category: z.enum(PostCategory),
      }),
      body,
    );
    return this.s.db.post.create({
      data: { ...data, authorId: user.id },
      include: postInclude,
      omit: postOmit,
    });
  }
  @Post('posts/:id/image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadPostImage(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const post = await this.s.db.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post || (post.authorId !== user.id && user.role !== 'ADMIN'))
      throw new NotFoundException();
    if (!file || !['image/png', 'image/jpeg'].includes(file.mimetype))
      throw new BadRequestException('Выберите PNG или JPEG до 10 МБ');
    const b = file.buffer;
    const valid =
      file.mimetype === 'image/png'
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : b[0] === 255 && b[1] === 216;
    if (!valid)
      throw new BadRequestException('Содержимое файла не соответствует типу');
    await this.s.bucketReady();
    await this.s.minio.putObject(this.s.bucket, `posts/${id}`, b, b.length, {
      'Content-Type': file.mimetype,
    });
    return this.s.db.post.update({
      where: { id },
      data: { imageUrl: `/api/inside/posts/${id}/image` },
      select: { id: true, imageUrl: true },
    });
  }
  @Post('posts/:id/comments')
  async comment(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.s.throttle(`comment:${user.id}`, 15, 60);
    const data = parse(
      z.object({ body: text(1000), parentId: z.string().optional() }),
      body,
    );
    const post = await this.s.db.post.findFirst({
      where: { id, published: true },
    });
    if (!post) throw new NotFoundException();
    if (
      data.parentId &&
      !(await this.s.db.comment.findFirst({
        where: { id: data.parentId, postId: id },
      }))
    )
      throw new BadRequestException('Комментарий не найден');
    return this.s.db.comment.create({
      data: { postId: id, authorId: user.id, ...data },
      include: { author: { select: personSelect } },
      omit: { authorId: true },
    });
  }
  @Post('posts/:id/react')
  async react(@CurrentUser() user: Principal, @Param('id') id: string) {
    const post = await this.s.db.post.findFirst({
      where: { id, published: true },
    });
    if (!post) throw new NotFoundException();
    const where = {
      postId_employeeId_type: { postId: id, employeeId: user.id, type: 'like' },
    };
    const current = await this.s.db.reaction.findUnique({ where });
    if (current) await this.s.db.reaction.delete({ where });
    else
      await this.s.db.reaction.create({
        data: { postId: id, employeeId: user.id },
      });
    return {
      reacted: !current,
      count: await this.s.db.reaction.count({ where: { postId: id } }),
    };
  }
  @Get('celebrations')
  async celebrations() {
    const stored = await this.s.db.celebration.findMany({
      orderBy: { date: 'desc' },
      take: 30,
      include: {
        _count: { select: { comments: true, reactions: true } },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: personSelect } },
          omit: { authorId: true },
        },
      },
    });
    const ids = stored.map((s) => s.employeeId);
    const people = await this.s.db.employee.findMany({
      where: { id: { in: ids }, publicCelebrations: true },
      select: { ...personSelect, id: true, showBirthday: true },
    });
    const map = new Map(people.map((p) => [p.id, p]));
    return stored.flatMap((s) => {
      const person = map.get(s.employeeId);
      if (!person || (s.kind === 'BIRTHDAY' && !person.showBirthday)) return [];
      const { id: _, showBirthday: __, ...employee } = person;
      const { employeeId: ___, ...celebration } = s;
      return [{ ...celebration, employee }];
    });
  }
  @Post('celebrations/:id/react')
  async celebrate(@CurrentUser() user: Principal, @Param('id') id: string) {
    const event = await this.s.db.celebration.findUnique({ where: { id } });
    if (!event) throw new NotFoundException();
    const target = await this.s.db.employee.findUnique({
      where: { id: event.employeeId },
    });
    if (
      !target?.publicCelebrations ||
      (event.kind === 'BIRTHDAY' && !target.showBirthday)
    )
      throw new NotFoundException();
    const where = {
      celebrationId_employeeId: { celebrationId: id, employeeId: user.id },
    };
    const current = await this.s.db.celebrationReaction.findUnique({ where });
    if (current) await this.s.db.celebrationReaction.delete({ where });
    else
      await this.s.db.celebrationReaction.create({
        data: { celebrationId: id, employeeId: user.id },
      });
    return { reacted: !current };
  }
  @Post('celebrations/:id/comments')
  async celebrationComment(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.s.throttle(`celebration:${user.id}`, 15, 60);
    const event = await this.s.db.celebration.findUnique({ where: { id } });
    if (!event) throw new NotFoundException();
    const target = await this.s.db.employee.findUnique({
      where: { id: event.employeeId },
    });
    if (
      !target?.publicCelebrations ||
      (event.kind === 'BIRTHDAY' && !target.showBirthday)
    )
      throw new NotFoundException();
    const data = parse(z.object({ body: text(500) }), body);
    return this.s.db.celebrationComment.create({
      data: { celebrationId: id, authorId: user.id, ...data },
    });
  }
  @Get('events') events() {
    return this.s.db.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
    });
  }
  @Get('benefits')
  async benefits(@CurrentUser() user: Principal) {
    const me = await this.s.db.employee.findUniqueOrThrow({
      where: { id: user.id },
      select: { team: true },
    });
    return this.s.db.benefit.findMany({
      where: {
        active: true,
        OR: [
          { allowedTeams: { isEmpty: true } },
          { allowedTeams: { has: me.team } },
        ],
      },
      orderBy: { category: 'asc' },
    });
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(@Inject(ApiService) private readonly s: ApiService) {}
  @Get('summary')
  async summary() {
    const [people, posts, events, benefits, assets, audit] = await Promise.all([
      this.s.db.employee.count(),
      this.s.db.post.count(),
      this.s.db.event.count(),
      this.s.db.benefit.count(),
      this.s.db.brandAsset.count(),
      this.s.db.auditEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);
    return { people, posts, events, benefits, assets, audit };
  }
  @Get('posts') posts() {
    return this.s.db.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: postInclude,
      omit: postOmit,
    });
  }
  @Get('people')
  async people() {
    const people = await this.s.db.employee.findMany({
      orderBy: { name: 'asc' },
      select: {
        ...personSelect,
        id: true,
        role: true,
        managerId: true,
        unitId: true,
      },
    });
    const ids = new Map(people.map((p) => [p.id, p.publicId]));
    return people.map(({ id, managerId, ...person }) => ({
      ...person,
      managerId: managerId ? ids.get(managerId) || null : null,
    }));
  }
  @Post('events')
  async event(@CurrentUser() user: Principal, @Body() body: unknown) {
    const d = parse(
      z.object({
        title: text(120),
        description: text(2000),
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        location: text(160),
        link: url.optional(),
      }),
      body,
    );
    if (new Date(d.endsAt) <= new Date(d.startsAt))
      throw new BadRequestException('Дата окончания должна быть позже начала');
    return this.s.auditedWrite(
      user.id,
      'create',
      'Event',
      (tx) =>
        tx.event.create({
          data: {
            ...d,
            startsAt: new Date(d.startsAt),
            endsAt: new Date(d.endsAt),
          },
        }),
      (result) => result.id,
    );
  }
  @Post('benefits')
  async benefit(@CurrentUser() user: Principal, @Body() body: unknown) {
    const d = parse(
      z.object({
        title: text(120),
        category: text(80),
        description: text(2000),
        eligibility: text(400),
        instruction: text(1000),
        contact: text(160),
        serviceUrl: url.optional(),
        allowedTeams: z.array(z.string()).default([]),
      }),
      body,
    );
    return this.s.auditedWrite(
      user.id,
      'create',
      'Benefit',
      (tx) => tx.benefit.create({ data: d }),
      (result) => result.id,
    );
  }
  @Patch('benefits/:id')
  async updateBenefit(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const d = parse(
      z.object({
        active: z.boolean().optional(),
        title: text(120).optional(),
        description: text(2000).optional(),
        eligibility: text(400).optional(),
        instruction: text(1000).optional(),
        contact: text(160).optional(),
        allowedTeams: z.array(z.string()).optional(),
      }),
      body,
    );
    return this.s.auditedWrite(
      user.id,
      'update',
      'Benefit',
      (tx) => tx.benefit.update({ where: { id }, data: d }),
      () => id,
    );
  }
  @Patch('posts/:id')
  async moderate(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const d = parse(
      z.object({
        published: z.boolean().optional(),
        pinned: z.boolean().optional(),
      }),
      body,
    );
    return this.s.auditedWrite(
      user.id,
      'moderate',
      'Post',
      (tx) => tx.post.update({ where: { id }, data: d, omit: postOmit }),
      () => id,
      d,
    );
  }
  @Post('units')
  async unit(@CurrentUser() user: Principal, @Body() body: unknown) {
    const d = parse(
      z.object({
        name: text(100),
        description: z.string().max(500).optional(),
        parentId: z.string().optional(),
      }),
      body,
    );
    return this.s.auditedWrite(
      user.id,
      'create',
      'Unit',
      (tx) => tx.unit.create({ data: d }),
      (result) => result.id,
    );
  }
  @Post('people')
  async person(@CurrentUser() user: Principal, @Body() body: unknown) {
    const d = parse(
      z.strictObject({
        name: text(100),
        email: z.email(),
        password: z.string().min(10),
        title: text(100),
        team: text(100),
        unitId: z.string(),
        location: text(100),
        joinedAt: z.iso.datetime(),
        role: z.enum(Role).default('EMPLOYEE'),
      }),
      body,
    );
    const { password, ...rest } = d;
    const passwordHash = await bcrypt.hash(password, 12);
    return this.s.auditedWrite(
      user.id,
      'create',
      'Employee',
      (tx) =>
        tx.employee.create({
          data: {
            ...rest,
            email: d.email.toLowerCase(),
            passwordHash,
            joinedAt: new Date(d.joinedAt),
          },
          select: personSelect,
        }),
      (result) => result.publicId,
    );
  }
  @Patch('people/employee/:number')
  async updatePerson(
    @CurrentUser() user: Principal,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const publicId = employeePublicId(number);
    const d = parse(
      z.strictObject({
        name: text(100).optional(),
        title: text(100).optional(),
        team: text(100).optional(),
        unitId: z.string().optional(),
        managerId: z
          .string()
          .regex(/^employee\/[0-9]{11}$/)
          .nullable()
          .optional(),
        location: text(100).optional(),
        bio: z.string().max(2000).optional(),
        skills: z.array(z.string().max(60)).optional(),
        role: z.enum(Role).optional(),
      }),
      body,
    );
    const { managerId, ...rest } = d;
    let managerInternalId: string | null | undefined;
    if (managerId === null) managerInternalId = null;
    else if (managerId) {
      const manager = await this.s.db.employee.findUnique({
        where: { publicId: managerId },
        select: { id: true },
      });
      if (!manager) throw new NotFoundException('Руководитель не найден');
      managerInternalId = manager.id;
    }
    return this.s.auditedWrite(
      user.id,
      'update',
      'Employee',
      (tx) =>
        tx.employee.update({
          where: { publicId },
          data: {
            ...rest,
            ...(managerInternalId !== undefined
              ? { managerId: managerInternalId }
              : {}),
          },
          select: personSelect,
        }),
      () => publicId,
    );
  }
  @Post('people/employee/:number/career')
  async career(
    @CurrentUser() user: Principal,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const publicId = employeePublicId(number);
    const d = parse(
      z.object({
        kind: z.enum([
          'JOINED',
          'TRANSFER',
          'PROMOTION',
          'ROLE_CHANGE',
          'AWARD',
        ]),
        title: text(120),
        detail: z.string().max(500).optional(),
        date: z.iso.datetime(),
      }),
      body,
    );
    const employee = await this.s.db.employee.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException();
    return this.s.auditedWrite(
      user.id,
      'create',
      'CareerEvent',
      (tx) =>
        tx.careerEvent.create({
          data: { ...d, date: new Date(d.date), employeeId: employee.id },
          select: {
            id: true,
            kind: true,
            title: true,
            detail: true,
            date: true,
          },
        }),
      (result) => result.id,
    );
  }
}

@ApiTags('brand')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('brand')
export class BrandController {
  constructor(@Inject(ApiService) private readonly s: ApiService) {}
  @Get()
  list(
    @CurrentUser() user: Principal,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.s.db.brandAsset.findMany({
      where: {
        ...(user.role === 'ADMIN' ? {} : { restricted: false }),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        usage: true,
        mimeType: true,
        size: true,
        version: true,
        updatedAt: true,
      },
    });
  }
  @Get(':id/download')
  async download(
    @CurrentUser() user: Principal,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const asset = await this.s.db.brandAsset.findUnique({ where: { id } });
    if (!asset || (asset.restricted && user.role !== 'ADMIN'))
      throw new NotFoundException();
    const stream = await this.s.minio.getObject(this.s.bucket, asset.objectKey);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${asset.id}"`);
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Cache-Control', 'private, no-store');
    stream.pipe(res);
  }
  @Post('upload')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async upload(
    @CurrentUser() user: Principal,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    if (!file) throw new BadRequestException('Выберите файл');
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/svg+xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype))
      throw new BadRequestException('Недопустимый тип файла');
    const b = file.buffer;
    const valid =
      file.mimetype === 'image/png'
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : file.mimetype === 'image/jpeg'
          ? b[0] === 255 && b[1] === 216
          : file.mimetype === 'application/pdf'
            ? b.subarray(0, 5).toString() === '%PDF-'
            : file.mimetype === 'image/svg+xml'
              ? /^\s*<\?xml[^>]*>\s*<svg|^\s*<svg/i.test(b.toString('utf8')) &&
                !/<script|on\w+\s*=|<foreignObject|javascript:|data:/i.test(
                  b.toString('utf8'),
                )
              : b.subarray(0, 2).toString() === 'PK';
    if (!valid)
      throw new BadRequestException('Содержимое файла не соответствует типу');
    const d = parse(
      z.object({
        title: text(120),
        category: text(80),
        description: text(500),
        usage: text(500),
        version: text(30),
      }),
      body,
    );
    await this.s.bucketReady();
    const key = `brand/${crypto.randomUUID()}`;
    await this.s.minio.putObject(this.s.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    try {
      return await this.s.auditedWrite(
        user.id,
        'upload',
        'BrandAsset',
        (tx) =>
          tx.brandAsset.create({
            data: {
              ...d,
              objectKey: key,
              mimeType: file.mimetype,
              size: file.size,
            },
            select: {
              id: true,
              category: true,
              title: true,
              description: true,
              usage: true,
              mimeType: true,
              size: true,
              version: true,
              updatedAt: true,
            },
          }),
        (result) => result.id,
      );
    } catch (error) {
      try {
        await this.s.minio.removeObject(this.s.bucket, key);
      } catch {
        /* The original database error takes precedence; storage reconciliation is documented. */
      }
      throw error;
    }
  }
}
