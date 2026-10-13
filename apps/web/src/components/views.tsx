'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Download,
  Gift,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Network,
  Palette,
  PenLine,
  Plus,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  api,
  send,
  type Person,
  type Post,
  type Event,
  type Benefit,
  type Asset,
  type Celebration,
  type Comment,
} from '@/lib/api';
import {
  Avatar,
  Button,
  DateText,
  Empty,
  ErrorBox,
  Loading,
  SectionHead,
  Shell,
} from './ui';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './dialog';
import { Markdown } from './markdown';
import { BrandMark } from './brand-mark';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const categoryNames: Record<string, string> = {
  NEWS: 'Новости',
  DISCUSSION: 'Обсуждение',
  QUESTION: 'Вопрос',
  IDEA: 'Идея',
  ACHIEVEMENT: 'Достижение',
  EVENT: 'Событие',
  THANKS: 'Благодарность',
  SOCIAL: 'Общение',
};
const short = (s: string, n = 145) =>
  s.length > n ? `${s.slice(0, n).trim()}…` : s;
function Page({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
function Intro({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function PeopleView() {
  const [search, setSearch] = useState(''),
    [unit, setUnit] = useState(''),
    [team, setTeam] = useState(''),
    [layout, setLayout] = useState<'grid' | 'list'>('grid'),
    [group, setGroup] = useState(false);
  const q = useQuery({
    queryKey: ['people', search, unit, team],
    queryFn: () =>
      api<{ items: Person[]; total: number }>(
        `people?search=${encodeURIComponent(search)}&unitId=${encodeURIComponent(unit)}&team=${encodeURIComponent(team)}&take=40`,
      ),
  });
  const org = useQuery({
    queryKey: ['org'],
    queryFn: () =>
      api<{
        units: { id: string; name: string; parentId: string | null }[];
        people: Person[];
      }>('org'),
  });
  const teams = [...new Set(org.data?.people.map((p) => p.team) || [])].sort();
  const renderPerson = (p: Person) =>
    layout === 'grid' ? (
      <Link
        href={`/people/${p.publicId}`}
        className="person-card"
        key={p.publicId}
      >
        <Avatar person={p} size={56} />
        <h3>{p.name}</h3>
        <p>{p.title}</p>
        <footer>
          <span>
            {p.unit.name} · {p.team}
          </span>
          <span>{p.location}</span>
        </footer>
      </Link>
    ) : (
      <Link
        href={`/people/${p.publicId}`}
        className="person-line"
        key={p.publicId}
      >
        <Avatar person={p} size={39} />
        <strong>
          {p.name}
          <small
            style={{
              display: 'block',
              color: 'var(--muted)',
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            {p.title}
          </small>
        </strong>
        <span>{p.team}</span>
        <span>{p.location}</span>
      </Link>
    );
  const items = q.data?.items || [];
  const groups = group ? [...new Set(items.map((p) => p.team))].sort() : [''];
  return (
    <Page>
      <Intro
        eyebrow="ЛЮДИ min.Inside"
        title="Мы — команда"
        subtitle="Находите коллег, знакомьтесь и открывайте новые связи."
      />
      <div className="toolbar">
        <input
          aria-label="Поиск сотрудников"
          placeholder="Поиск по имени, роли или команде"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Подразделение"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="">Все подразделения</option>
          {org.data?.units
            .filter((u) => u.parentId !== null)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Команда"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="segmented">
          <button
            type="button"
            className={layout === 'grid' ? 'active' : ''}
            onClick={() => setLayout('grid')}
            aria-label="Карточки"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={layout === 'list' ? 'active' : ''}
            onClick={() => setLayout('list')}
            aria-label="Список"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={group ? 'active' : ''}
            onClick={() => setGroup((v) => !v)}
            aria-label="Группировать по командам"
          >
            <Users size={16} />
          </button>
        </div>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : items.length ? (
        <>
          <p className="muted" style={{ marginBottom: 15 }}>
            {q.data?.total} коллег
          </p>
          {groups.map((g) => (
            <section key={g} style={{ marginBottom: group ? 35 : 0 }}>
              {group && <h2 style={{ fontSize: 24, marginBottom: 15 }}>{g}</h2>}
              <div
                className={layout === 'grid' ? 'people-grid' : 'person-list'}
              >
                {items.filter((p) => !g || p.team === g).map(renderPerson)}
              </div>
            </section>
          ))}
        </>
      ) : (
        <Empty
          title="Коллеги не найдены"
          description="Попробуйте другой запрос или фильтр"
        />
      )}
    </Page>
  );
}

const postSchema = z.object({
  title: z.string().min(5, 'Минимум 5 символов').max(120),
  body: z.string().min(10, 'Расскажите чуть подробнее').max(5000),
  category: z.enum([
    'NEWS',
    'DISCUSSION',
    'QUESTION',
    'IDEA',
    'ACHIEVEMENT',
    'EVENT',
    'THANKS',
    'SOCIAL',
  ]),
});
type PostInput = z.infer<typeof postSchema>;
export function CommunityView() {
  const [category, setCategory] = useState(''),
    [search, setSearch] = useState(''),
    [compose, setCompose] = useState(false),
    [preview, setPreview] = useState(false),
    [image, setImage] = useState<File | null>(null),
    [uploadWarning, setUploadWarning] = useState('');
  const qc = useQueryClient();
  const composeTrigger = useRef<HTMLButtonElement>(null);
  const q = useQuery({
    queryKey: ['posts', category, search],
    queryFn: () =>
      api<{ items: Post[]; total: number }>(
        `posts?category=${category}&search=${encodeURIComponent(search)}&take=40`,
      ),
  });
  const form = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', body: '', category: 'DISCUSSION' },
  });
  const addMarkup = (markup: string) =>
    form.setValue(
      'body',
      `${form.getValues('body')}${form.getValues('body') ? '\n' : ''}${markup}`,
      { shouldValidate: true },
    );
  const mutation = useMutation({
    mutationFn: async (d: PostInput) => {
      const created = await send<Post>('posts', d);
      if (image) {
        const upload = new FormData();
        upload.set('file', image);
        try {
          await api(`posts/${created.id}/image`, {
            method: 'POST',
            body: upload,
          });
        } catch (e) {
          setUploadWarning(
            `Публикация сохранена, но изображение не загрузилось: ${(e as Error).message}`,
          );
        }
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      setCompose(false);
      setImage(null);
      form.reset();
    },
  });
  return (
    <Page>
      <Intro
        eyebrow="СООБЩЕСТВО"
        title="Разговоры внутри"
        subtitle="Делитесь идеями, задавайте вопросы и узнавайте новости из первых рук."
        action={
          <Button
            ref={composeTrigger}
            onClick={() => {
              setUploadWarning('');
              setCompose(true);
            }}
          >
            <PenLine size={16} /> Написать пост
          </Button>
        }
      />
      {uploadWarning && (
        <p className="form-error" role="alert">
          {uploadWarning}
        </p>
      )}
      <div className="toolbar">
        <input
          aria-label="Поиск публикаций"
          placeholder="Поиск обсуждений"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Категория"
        >
          <option value="">Все темы</option>
          {Object.entries(categoryNames).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : q.data?.items.length ? (
        <div className="post-list">
          {q.data.items.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Пока нет публикаций"
          description="Станьте первым, кто начнёт разговор"
        />
      )}
      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent
          className="modal"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            composeTrigger.current?.focus();
          }}
        >
          <div className="modal-header">
            <DialogTitle>Новая публикация</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="icon-button"
                aria-label="Закрыть"
              >
                <X />
              </button>
            </DialogClose>
          </div>
          <form
            className="compose-form"
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
          >
            <select
              {...form.register('category')}
              aria-label="Категория публикации"
            >
              {Object.entries(categoryNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <input
              aria-label="Заголовок публикации"
              autoComplete="off"
              placeholder="Заголовок"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <span className="form-error">
                {form.formState.errors.title.message}
              </span>
            )}
            <div
              className="format-toolbar"
              role="toolbar"
              aria-label="Форматирование"
            >
              <button
                type="button"
                onClick={() => addMarkup('**жирный текст**')}
                aria-label="Жирный текст"
              >
                <strong>Ж</strong>
              </button>
              <button
                type="button"
                onClick={() => addMarkup('_курсив_')}
                aria-label="Курсив"
              >
                <em>К</em>
              </button>
              <button
                type="button"
                onClick={() => addMarkup('- пункт списка')}
                aria-label="Список"
              >
                ☷
              </button>
              <button
                type="button"
                onClick={() => addMarkup('[ссылка](https://example.com)')}
                aria-label="Ссылка"
              >
                ↗
              </button>
              <button
                type="button"
                style={{ marginLeft: 'auto' }}
                onClick={() => setPreview((v) => !v)}
              >
                {preview ? 'Редактор' : 'Предпросмотр'}
              </button>
            </div>
            {preview ? (
              <div className="markdown-preview">
                <Markdown
                  source={
                    form.watch('body') ||
                    'Начните писать, чтобы увидеть предпросмотр.'
                  }
                />
              </div>
            ) : (
              <textarea
                aria-label="Текст публикации"
                placeholder="О чём хотите рассказать?"
                {...form.register('body')}
              />
            )}
            <small className="muted">
              Поддерживаются жирный текст, курсив, списки и ссылки.
            </small>
            {form.formState.errors.body && (
              <span className="form-error">
                {form.formState.errors.body.message}
              </span>
            )}
            <div className="field">
              <label htmlFor="post-image">
                Изображение · PNG или JPEG до 10 МБ
              </label>
              <input
                id="post-image"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </div>
            {mutation.error && (
              <span className="form-error">{mutation.error.message}</span>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              <Send size={16} /> Опубликовать
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
function PostCard({ post: p }: { post: Post }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api<{ count: number }>(`posts/${p.id}/react`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
  return (
    <article className="post-card">
      <div className="feed-meta">
        <Avatar person={p.author} size={34} />
        <strong>{p.author.name}</strong>
        <span>·</span>
        <DateText value={p.createdAt} />
        {p.pinned && <span className="tag">Закреплено</span>}
      </div>
      <Link href={`/community/${p.id}`}>
        <h3>{p.title}</h3>
      </Link>
      <span className="tag">{categoryNames[p.category]}</span>
      <p>{short(p.body, 420)}</p>
      {p.imageUrl && (
        <img
          className="post-image"
          src={p.imageUrl}
          alt="Изображение публикации"
        />
      )}
      <div className="post-actions">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          aria-label="Поставить реакцию"
        >
          <Heart size={17} />
          {p._count.reactions}
        </button>
        <Link href={`/community/${p.id}`}>
          <MessageCircle size={17} />
          {p._count.comments} комментариев
        </Link>
      </div>
    </article>
  );
}
export function PostView() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState(''),
    [reply, setReply] = useState<string | undefined>();
  const q = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<Post>(`posts/${id}`),
  });
  const mutation = useMutation({
    mutationFn: () =>
      send<Comment>(`posts/${id}/comments`, { body, parentId: reply }),
    onSuccess: () => {
      setBody('');
      setReply(undefined);
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
  return (
    <Page>
      <div className="post-detail">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} />
        ) : (
          q.data && (
            <>
              <Link href="/community" className="text-link">
                ← Все публикации
              </Link>
              <div style={{ marginTop: 35 }}>
                <span className="tag">{categoryNames[q.data.category]}</span>
                <h1>{q.data.title}</h1>
                <div className="feed-meta">
                  <Avatar person={q.data.author} size={35} />
                  <Link href={`/people/${q.data.author.publicId}`}>
                    <strong>{q.data.author.name}</strong>
                  </Link>
                  <DateText value={q.data.createdAt} />
                </div>
              </div>
              <article style={{ margin: '35px 0 50px' }}>
                <Markdown source={q.data.body} />
                {q.data.imageUrl && (
                  <img
                    className="post-image"
                    src={q.data.imageUrl}
                    alt="Изображение публикации"
                  />
                )}
              </article>
              <SectionHead
                title={`Комментарии · ${q.data.comments?.length || 0}`}
              />
              {q.data.comments?.map((c) => (
                <div
                  className={`comment ${c.parentId ? 'reply' : ''}`}
                  key={c.id}
                >
                  <Avatar person={c.author} size={34} />
                  <div>
                    <strong>{c.author.name}</strong>{' '}
                    <small>
                      <DateText value={c.createdAt} />
                    </small>
                    <p>{c.body}</p>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setReply(c.id)}
                    >
                      Ответить
                    </button>
                  </div>
                </div>
              ))}
              <div className="comment-form">
                {reply && (
                  <p className="muted">
                    Ответ на комментарий{' '}
                    <button type="button" onClick={() => setReply(undefined)}>
                      ×
                    </button>
                  </p>
                )}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Напишите комментарий..."
                  aria-label="Комментарий"
                />
                {mutation.error && (
                  <p className="form-error">{mutation.error.message}</p>
                )}
                <Button
                  disabled={body.trim().length < 1 || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  Отправить
                </Button>
              </div>
            </>
          )
        )}
      </div>
    </Page>
  );
}

type OrgUnit = {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
};
type OrgPerson = Person & { unitId: string; managerId?: string };
export function OrgView() {
  const q = useQuery({
    queryKey: ['org'],
    queryFn: () => api<{ units: OrgUnit[]; people: OrgPerson[] }>('org'),
  });
  const [list, setList] = useState(false),
    [search, setSearch] = useState(''),
    [collapsed, setCollapsed] = useState<string[] | null>(null);
  const router = useRouter();
  const units = q.data?.units || [],
    people = q.data?.people || [];
  const collapsedIds =
    collapsed ?? units.filter((u) => u.parentId).map((u) => u.id);
  const match = people.find(
    (p) =>
      search.length > 1 && p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const ancestors = new Set<string>();
  if (match) {
    let unit = units.find((u) => u.id === match.unitId);
    while (unit) {
      ancestors.add(unit.id);
      unit = units.find((u) => u.id === unit?.parentId);
    }
  }
  const activeCollapsed = match
    ? collapsedIds.filter((id) => !ancestors.has(id))
    : collapsedIds;
  const visible = units.filter((u) => {
    let parent = units.find((p) => p.id === u.parentId);
    while (parent) {
      if (activeCollapsed.includes(parent.id)) return false;
      parent = units.find((p) => p.id === parent?.parentId);
    }
    return true;
  });
  const columns: OrgUnit[][] = [];
  for (const u of visible) {
    let depth = 0,
      parent = units.find((p) => p.id === u.parentId);
    while (parent) {
      depth++;
      parent = units.find((p) => p.id === parent?.parentId);
    }
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(u);
  }
  const unitHeight = (u: OrgUnit) =>
    Math.max(
      130,
      activeCollapsed.includes(u.id)
        ? 130
        : people.filter((p) => p.unitId === u.id).length * 68 + 30,
    );
  const columnY = (depth: number, index: number) =>
    depth === 0
      ? Math.max(
          0,
          ((columns[1] || []).reduce((sum, u) => sum + unitHeight(u), 0) - 70) /
            2,
        )
      : columns[depth]
          .slice(0, index)
          .reduce((sum, u) => sum + unitHeight(u), 0);
  const nodes: Node[] = visible.map((u) => {
    let depth = 0,
      parent = units.find((p) => p.id === u.parentId);
    while (parent) {
      depth++;
      parent = units.find((p) => p.id === parent?.parentId);
    }
    const index = columns[depth].findIndex((x) => x.id === u.id);
    return {
      id: u.id,
      position: { x: depth * 270, y: columnY(depth, index) },
      data: {
        label: (
          <div
            className="org-node"
            style={ancestors.has(u.id) ? { borderColor: 'var(--primary)' } : {}}
          >
            <strong>{u.name}</strong>
            <small>
              {u.parentId
                ? people.filter((p) => p.unitId === u.id).length
                : people.length}{' '}
              человек
            </small>
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 9 }}
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((v) => {
                  const current =
                    v ?? units.filter((x) => x.parentId).map((x) => x.id);
                  return current.includes(u.id)
                    ? current.filter((id) => id !== u.id)
                    : [...current, u.id];
                });
              }}
            >
              {activeCollapsed.includes(u.id) ? 'Раскрыть' : 'Свернуть'}{' '}
              <ChevronDown size={13} />
            </button>
          </div>
        ),
      },
      style: { width: 190, padding: 0, border: 0, background: 'transparent' },
    };
  });
  const visiblePeople = people.filter(
    (p) =>
      visible.some((u) => u.id === p.unitId) &&
      !activeCollapsed.includes(p.unitId),
  );
  for (const person of visiblePeople) {
    const unit = units.find((u) => u.id === person.unitId);
    if (!unit) continue;
    let depth = 0,
      parent = units.find((u) => u.id === unit.parentId);
    while (parent) {
      depth++;
      parent = units.find((u) => u.id === parent?.parentId);
    }
    const group = columns[depth].findIndex((u) => u.id === unit.id),
      index = visiblePeople
        .filter((p) => p.unitId === unit.id)
        .findIndex((p) => p.publicId === person.publicId);
    nodes.push({
      id: `person-${person.publicId}`,
      position: { x: (depth + 1) * 270, y: columnY(depth, group) + index * 68 },
      data: {
        label: (
          <button
            type="button"
            className="org-person-node"
            onClick={() => router.push(`/people/${person.publicId}`)}
            style={
              match?.publicId === person.publicId
                ? { borderColor: 'var(--primary)' }
                : {}
            }
          >
            <Avatar person={person} size={32} />
            <span>
              <strong>{person.name}</strong>
              <small>{person.title}</small>
            </span>
          </button>
        ),
      },
      style: { width: 220, padding: 0, border: 0, background: 'transparent' },
    });
  }
  const edges: Edge[] = visible
    .filter(
      (u): u is OrgUnit & { parentId: string } =>
        typeof u.parentId === 'string' &&
        visible.some((p) => p.id === u.parentId),
    )
    .map((u) => ({
      id: u.id,
      source: u.parentId,
      target: u.id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--org-link)' },
      style: {
        stroke: ancestors.has(u.id) ? 'var(--primary)' : 'var(--org-link)',
      },
    }));
  for (const person of visiblePeople)
    edges.push({
      id: `edge-${person.publicId}`,
      source:
        person.managerId &&
        visiblePeople.some((p) => p.publicId === person.managerId)
          ? `person-${person.managerId}`
          : person.unitId,
      target: `person-${person.publicId}`,
      type: 'smoothstep',
      style: {
        stroke:
          match?.publicId === person.publicId
            ? 'var(--primary)'
            : 'var(--org-link-muted)',
      },
    });
  return (
    <Page>
      <Intro
        eyebrow="НАША КОМАНДА"
        title="Как мы устроены"
        subtitle="Исследуйте направления, команды и связи между людьми."
      />
      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти коллегу"
          aria-label="Найти сотрудника в структуре"
        />
        <div className="segmented">
          <button
            type="button"
            className={!list ? 'active' : ''}
            onClick={() => setList(false)}
          >
            <Network size={16} /> Схема
          </button>
          <button
            type="button"
            className={list ? 'active' : ''}
            onClick={() => setList(true)}
          >
            <List size={16} /> Список
          </button>
        </div>
      </div>
      {match && (
        <button
          type="button"
          className="person-tile"
          style={{ marginBottom: 16, maxWidth: 340, cursor: 'pointer' }}
          onClick={() => router.push(`/people/${match.publicId}`)}
        >
          <Avatar person={match} size={38} />
          <span>
            <strong>{match.name}</strong>
            <small>{match.title}</small>
          </span>
          <ArrowRight size={15} />
        </button>
      )}
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : list ? (
        <div className="org-tree">
          {units.map((u) => (
            <details
              className="org-unit"
              key={u.id}
              open={ancestors.has(u.id) || undefined}
            >
              <summary>
                {u.name} · {people.filter((p) => p.unitId === u.id).length}{' '}
                человек
              </summary>
              <p className="muted">{u.description}</p>
              <div className="org-members">
                {people
                  .filter((p) => p.unitId === u.id)
                  .map((p) => (
                    <Link href={`/people/${p.publicId}`} key={p.publicId}>
                      <Avatar person={p} size={28} />
                      {p.name}
                    </Link>
                  ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="org-wrap">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background color="var(--org-grid)" gap={18} />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </Page>
  );
}

const benefitIcons: Record<string, React.ReactNode> = {
  Здоровье: <Heart />,
  Спорт: <Sparkles />,
  Образование: <BookOpen />,
  Отдых: <Gift />,
};
export function BenefitsView() {
  const [category, setCategory] = useState('');
  const q = useQuery({
    queryKey: ['benefits'],
    queryFn: () => api<Benefit[]>('benefits'),
  });
  const cats = [...new Set(q.data?.map((b) => b.category) || [])];
  const items =
    q.data?.filter((b) => !category || b.category === category) || [];
  return (
    <Page>
      <Intro
        eyebrow="ЗАБОТА О КОМАНДЕ"
        title="Больше возможностей"
        subtitle="Программы поддержки и развития для каждого этапа вашего пути."
      />
      <div className="toolbar">
        <div className="segmented">
          <button
            type="button"
            className={!category ? 'active' : ''}
            onClick={() => setCategory('')}
          >
            Все
          </button>
          {cats.map((c) => (
            <button
              type="button"
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : items.length ? (
        <div className="benefit-grid">
          {items.map((b) => (
            <article className="benefit-card" key={b.id}>
              <div className="benefit-icon">
                {benefitIcons[b.category] || <Gift />}
              </div>
              <span className="eyebrow">{b.category}</span>
              <h3>{b.title}</h3>
              <p>{b.description}</p>
              <details>
                <summary>Как воспользоваться</summary>
                <p>
                  <strong>Кому доступно:</strong> {b.eligibility}
                </p>
                <p>{b.instruction}</p>
                <a className="text-link" href={`mailto:${b.contact}`}>
                  {b.contact} <ArrowRight size={14} />
                </a>
                {b.serviceUrl && (
                  <p>
                    <a
                      className="text-link"
                      href={b.serviceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Перейти в сервис <ArrowRight size={14} />
                    </a>
                  </p>
                )}
              </details>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Программы пока не добавлены" />
      )}
    </Page>
  );
}

export function CelebrationsView() {
  const qc = useQueryClient();
  const commentTrigger = useRef<HTMLButtonElement | null>(null);
  const celebrations = useQuery({
    queryKey: ['celebrations'],
    queryFn: () => api<Celebration[]>('celebrations'),
  });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: () => api<Event[]>('events'),
  });
  const react = useMutation({
    mutationFn: (id: string) =>
      api(`celebrations/${id}/react`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['celebrations'] }),
  });
  const [commenting, setCommenting] = useState<string | null>(null),
    [text, setText] = useState('');
  const comment = useMutation({
    mutationFn: () =>
      send(`celebrations/${commenting}/comments`, { body: text }),
    onSuccess: () => {
      setText('');
      setCommenting(null);
      qc.invalidateQueries({ queryKey: ['celebrations'] });
    },
  });
  return (
    <Page>
      <Intro
        eyebrow="ВМЕСТЕ"
        title="Есть повод собраться"
        subtitle="Отмечаем важное, поддерживаем друг друга и встречаемся чаще."
      />
      <SectionHead eyebrow="ПОЗДРАВЛЯЕМ" title="Радостные новости" />
      {celebrations.isLoading ? (
        <Loading />
      ) : celebrations.error ? (
        <ErrorBox error={celebrations.error} />
      ) : celebrations.data?.length ? (
        <div className="celebration-grid">
          {celebrations.data.map((c) => (
            <article className="celebration-card" key={c.id}>
              <span className="tag">
                {c.kind === 'NEW_JOINER'
                  ? 'Новый коллега'
                  : c.kind === 'ACHIEVEMENT'
                    ? 'Достижение'
                    : 'Праздник'}
              </span>
              <div>
                <Avatar person={c.employee} size={60} />
              </div>
              <h3>{c.title}</h3>
              <Link
                href={`/people/${c.employee.publicId}`}
                className="text-link"
              >
                {c.employee.name} <ArrowRight size={14} />
              </Link>
              <p className="muted" style={{ marginTop: 10 }}>
                <DateText value={c.date} />
              </p>
              <div className="post-actions">
                <button type="button" onClick={() => react.mutate(c.id)}>
                  <Heart size={17} /> {c._count.reactions}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    commentTrigger.current = event.currentTarget;
                    setCommenting(c.id);
                  }}
                >
                  <MessageCircle size={17} /> Поздравить
                </button>
              </div>
              {c.comments?.length > 0 && (
                <div className="celebration-comments">
                  {c.comments.map((comment) => (
                    <p key={comment.id}>
                      <strong>{comment.author.name}:</strong> {comment.body}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Праздников пока нет" />
      )}
      <div style={{ marginTop: 55 }}>
        <SectionHead eyebrow="КАЛЕНДАРЬ" title="Встречаемся скоро" />
        {events.isLoading ? (
          <Loading />
        ) : events.error ? (
          <ErrorBox error={events.error} />
        ) : events.data?.length ? (
          <div className="event-list">
            {events.data.map((e) => (
              <div className="event-row" key={e.id}>
                <span className="event-date">
                  {new Date(e.startsAt).getDate()}
                  <small>
                    {new Intl.DateTimeFormat('ru-RU', {
                      month: 'short',
                    }).format(new Date(e.startsAt))}
                  </small>
                </span>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                  <p style={{ marginTop: 7 }}>
                    <MapPin size={13} style={{ display: 'inline' }} />{' '}
                    {e.location}
                  </p>
                </div>
                {e.link && (
                  <a
                    className="btn btn-secondary"
                    href={e.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Подробнее <ArrowRight size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Событий пока нет" />
        )}
      </div>
      <Dialog
        open={Boolean(commenting)}
        onOpenChange={(open) => {
          if (!open) setCommenting(null);
        }}
      >
        <DialogContent
          className="modal"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            commentTrigger.current?.focus();
          }}
        >
          <div className="modal-header">
            <DialogTitle>Написать поздравление</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="icon-button"
                aria-label="Закрыть"
              >
                <X />
              </button>
            </DialogClose>
          </div>
          <textarea
            aria-label="Текст поздравления"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Тёплые слова коллеге"
            style={{ width: '100%', minHeight: 100, padding: 12 }}
          />
          {comment.error && (
            <p className="form-error">{comment.error.message}</p>
          )}
          <Button
            disabled={!text.trim() || comment.isPending}
            onClick={() => comment.mutate()}
            style={{ marginTop: 12 }}
          >
            Отправить
          </Button>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

export function BrandView() {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('');
  const q = useQuery({
    queryKey: ['brand', search, category],
    queryFn: () =>
      api<Asset[]>(
        `brand?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`,
      ),
  });
  const cats = [...new Set(q.data?.map((a) => a.category) || [])];
  return (
    <Page>
      <Intro
        eyebrow="НАШ ВИЗУАЛЬНЫЙ ЯЗЫК"
        title="Бренд под рукой"
        subtitle="Актуальные материалы, шаблоны и правила использования."
      />
      <div className="toolbar">
        <input
          placeholder="Поиск материалов"
          aria-label="Поиск бренд-материалов"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Категория"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Все категории</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : q.data?.length ? (
        <div className="asset-grid">
          {q.data.map((a) => (
            <article className="asset-card" key={a.id}>
              <div className="asset-icon">
                <Palette size={40} strokeWidth={1.3} />
              </div>
              <span className="eyebrow" style={{ marginTop: 20 }}>
                {a.category}
              </span>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              <small>
                Версия {a.version} · обновлено <DateText value={a.updatedAt} />
              </small>
              <p style={{ fontSize: 11 }}>{a.usage}</p>
              <a
                className="btn btn-secondary"
                href={`/api/inside/brand/${a.id}/download`}
                style={{ marginTop: 12 }}
              >
                <Download size={15} /> Скачать
              </a>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Материалов пока нет"
          description="Администратор скоро добавит первые файлы"
        />
      )}
    </Page>
  );
}

type Summary = {
  people: number;
  posts: number;
  events: number;
  benefits: number;
  assets: number;
  audit: { id: string; action: string; entity: string; createdAt: string }[];
};
function AdminForm({
  title,
  fields,
  endpoint,
  onDone,
  formData = false,
}: {
  title: string;
  fields: {
    name: string;
    label: string;
    type?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
  }[];
  endpoint: string;
  onDone: () => void;
  formData?: boolean;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [ok, setOk] = useState(false);
  return (
    <div className="admin-panel">
      <h2>{title}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setOk(false);
          setBusy(true);
          const form = e.currentTarget;
          const data = new FormData(form);
          try {
            if (formData) {
              await api(endpoint, { method: 'POST', body: data });
            } else {
              const body = Object.fromEntries(data.entries());
              for (const key of Object.keys(body))
                if (body[key] === '') delete body[key];
              for (const key of ['startsAt', 'endsAt', 'joinedAt'])
                if (body[key])
                  body[key] = new Date(String(body[key])).toISOString();
              await send(endpoint, body);
            }
            setOk(true);
            form.reset();
            onDone();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`${endpoint}-${f.name}`}>{f.label}</label>
            {f.options ? (
              <select
                name={f.name}
                id={`${endpoint}-${f.name}`}
                required={f.required}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                name={f.name}
                id={`${endpoint}-${f.name}`}
                required={f.required}
              />
            ) : (
              <input
                name={f.name}
                id={`${endpoint}-${f.name}`}
                type={f.type || 'text'}
                required={f.required}
              />
            )}
          </div>
        ))}
        {error && <p className="form-error">{error}</p>}
        {ok && <p style={{ color: 'var(--primary)' }}>Сохранено</p>}
        <Button type="submit" disabled={busy}>
          <Plus size={15} /> Добавить
        </Button>
      </form>
    </div>
  );
}
type AdminPerson = Person & {
  role: 'EMPLOYEE' | 'ADMIN';
  managerId?: string;
  unitId: string;
};
function AdminPeople() {
  const qc = useQueryClient();
  const people = useQuery({
    queryKey: ['admin-people'],
    queryFn: () => api<AdminPerson[]>('admin/people'),
  });
  const org = useQuery({
    queryKey: ['org'],
    queryFn: () => api<{ units: OrgUnit[] }>('org'),
  });
  const [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const p = people.data?.find((x) => x.publicId === selected);
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    );
    if (data.managerId === '') data.managerId = null;
    try {
      await send(`admin/people/${selected}`, data, 'PATCH');
      setMessage('Данные сотрудника обновлены');
      qc.invalidateQueries({ queryKey: ['admin-people'] });
      qc.invalidateQueries({ queryKey: ['people'] });
      qc.invalidateQueries({ queryKey: ['person'] });
      qc.invalidateQueries({ queryKey: ['org'] });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const career = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await send(`admin/people/${selected}/career`, {
        ...data,
        date: new Date(String(data.date)).toISOString(),
      });
      setMessage('Событие добавлено в карьерный путь');
      form.reset();
      qc.invalidateQueries({ queryKey: ['person', selected] });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="admin-panel">
      <h2>Сотрудники и карьерный путь</h2>
      {people.isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="field">
            <label htmlFor="admin-person">Сотрудник</label>
            <select
              id="admin-person"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setMessage('');
                setError('');
              }}
            >
              <option value="">Выберите коллегу</option>
              {people.data?.map((x) => (
                <option value={x.publicId} key={x.publicId}>
                  {x.name} · {x.title}
                </option>
              ))}
            </select>
          </div>
          {p && (
            <div className="admin-columns">
              <form key={`edit-${p.publicId}`} onSubmit={save}>
                <h3>Профиль и доступ</h3>
                <div className="field">
                  <label htmlFor="admin-title">Должность</label>
                  <input
                    id="admin-title"
                    name="title"
                    defaultValue={p.title}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="admin-team">Команда</label>
                  <input
                    id="admin-team"
                    name="team"
                    defaultValue={p.team}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="admin-unit">Подразделение</label>
                  <select id="admin-unit" name="unitId" defaultValue={p.unitId}>
                    {org.data?.units
                      .filter((u) => u.parentId !== null)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="admin-manager">Руководитель</label>
                  <select
                    id="admin-manager"
                    name="managerId"
                    defaultValue={p.managerId || ''}
                  >
                    <option value="">Не указан</option>
                    {people.data
                      ?.filter((x) => x.publicId !== p.publicId)
                      .map((x) => (
                        <option key={x.publicId} value={x.publicId}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="admin-role">Роль</label>
                  <select id="admin-role" name="role" defaultValue={p.role}>
                    <option value="EMPLOYEE">Сотрудник</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                </div>
                <Button type="submit">Сохранить профиль</Button>
              </form>
              <form key={`career-${p.publicId}`} onSubmit={career}>
                <h3>Новое событие карьеры</h3>
                <div className="field">
                  <label htmlFor="career-kind">Тип события</label>
                  <select id="career-kind" name="kind">
                    <option value="PROMOTION">Повышение</option>
                    <option value="TRANSFER">Переход в команду</option>
                    <option value="ROLE_CHANGE">Новая роль</option>
                    <option value="AWARD">Награда</option>
                    <option value="JOINED">Выход в компанию</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="career-title">Название</label>
                  <input id="career-title" name="title" required />
                </div>
                <div className="field">
                  <label htmlFor="career-detail">Подробности</label>
                  <textarea id="career-detail" name="detail" />
                </div>
                <div className="field">
                  <label htmlFor="career-date">Дата</label>
                  <input
                    id="career-date"
                    name="date"
                    type="datetime-local"
                    required
                  />
                </div>
                <Button type="submit">Добавить событие</Button>
              </form>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          {message && (
            <p style={{ color: 'var(--primary)', marginTop: 12 }}>{message}</p>
          )}
        </>
      )}
    </div>
  );
}
export function AdminView() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => api<Summary>('admin/summary'),
  });
  const org = useQuery({
    queryKey: ['org'],
    queryFn: () => api<{ units: OrgUnit[] }>('org'),
  });
  const posts = useQuery({
    queryKey: ['admin-posts'],
    queryFn: () => api<Post[]>('admin/posts'),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-summary'] });
    qc.invalidateQueries({ queryKey: ['admin-posts'] });
    qc.invalidateQueries({ queryKey: ['org'] });
    qc.invalidateQueries({ queryKey: ['benefits'] });
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['brand'] });
  };
  const [moderationError, setModerationError] = useState('');
  const moderate = async (
    p: Post,
    key: 'published' | 'pinned',
    value: boolean,
  ) => {
    try {
      await send(`admin/posts/${p.id}`, { [key]: value }, 'PATCH');
      refresh();
    } catch (e) {
      setModerationError((e as Error).message);
    }
  };
  return (
    <Page>
      <Intro
        eyebrow="РАБОЧЕЕ ПРОСТРАНСТВО"
        title="Управление min.Inside"
        subtitle="Люди, контент и культура компании — в одном месте."
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <div className="admin-grid">
            {(
              [
                ['people', 'Сотрудники'],
                ['posts', 'Публикации'],
                ['events', 'События'],
                ['benefits', 'Бонусы'],
                ['assets', 'Материалы'],
              ] as const
            ).map(([key, label]) => (
              <div className="stat" key={key}>
                <strong>{q.data?.[key]}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="admin-columns">
            <div>
              <AdminForm
                title="Добавить событие"
                endpoint="admin/events"
                onDone={refresh}
                fields={[
                  { name: 'title', label: 'Название', required: true },
                  {
                    name: 'description',
                    label: 'Описание',
                    type: 'textarea',
                    required: true,
                  },
                  {
                    name: 'startsAt',
                    label: 'Начало',
                    type: 'datetime-local',
                    required: true,
                  },
                  {
                    name: 'endsAt',
                    label: 'Окончание',
                    type: 'datetime-local',
                    required: true,
                  },
                  { name: 'location', label: 'Место', required: true },
                  { name: 'link', label: 'Ссылка', type: 'url' },
                ]}
              />
              <AdminForm
                title="Добавить бонус"
                endpoint="admin/benefits"
                onDone={refresh}
                fields={[
                  { name: 'title', label: 'Название', required: true },
                  { name: 'category', label: 'Категория', required: true },
                  {
                    name: 'description',
                    label: 'Описание',
                    type: 'textarea',
                    required: true,
                  },
                  {
                    name: 'eligibility',
                    label: 'Кому доступно',
                    required: true,
                  },
                  {
                    name: 'instruction',
                    label: 'Как получить',
                    type: 'textarea',
                    required: true,
                  },
                  {
                    name: 'contact',
                    label: 'Контакт',
                    type: 'email',
                    required: true,
                  },
                ]}
              />
              <AdminForm
                title="Загрузить бренд-материал"
                endpoint="brand/upload"
                onDone={refresh}
                formData
                fields={[
                  { name: 'title', label: 'Название', required: true },
                  { name: 'category', label: 'Категория', required: true },
                  { name: 'description', label: 'Описание', required: true },
                  {
                    name: 'usage',
                    label: 'Правила использования',
                    required: true,
                  },
                  { name: 'version', label: 'Версия', required: true },
                  {
                    name: 'file',
                    label: 'Файл до 20 МБ',
                    type: 'file',
                    required: true,
                  },
                ]}
              />
            </div>
            <div>
              <AdminForm
                title="Добавить подразделение"
                endpoint="admin/units"
                onDone={refresh}
                fields={[
                  { name: 'name', label: 'Название', required: true },
                  { name: 'description', label: 'Описание' },
                  {
                    name: 'parentId',
                    label: 'В составе',
                    options: [
                      { value: '', label: 'Корневое подразделение' },
                      ...(org.data?.units || []).map((u) => ({
                        value: u.id,
                        label: u.name,
                      })),
                    ],
                  },
                ]}
              />
              <AdminForm
                title="Пригласить сотрудника"
                endpoint="admin/people"
                onDone={refresh}
                fields={[
                  { name: 'name', label: 'Имя и фамилия', required: true },
                  {
                    name: 'email',
                    label: 'Рабочий email',
                    type: 'email',
                    required: true,
                  },
                  {
                    name: 'password',
                    label: 'Временный пароль, от 10 символов',
                    type: 'password',
                    required: true,
                  },
                  { name: 'title', label: 'Должность', required: true },
                  { name: 'team', label: 'Команда', required: true },
                  {
                    name: 'unitId',
                    label: 'Подразделение',
                    required: true,
                    options: (org.data?.units || [])
                      .filter((u) => u.parentId !== null)
                      .map((u) => ({ value: u.id, label: u.name })),
                  },
                  { name: 'location', label: 'Локация', required: true },
                  {
                    name: 'joinedAt',
                    label: 'Дата выхода',
                    type: 'datetime-local',
                    required: true,
                  },
                  {
                    name: 'role',
                    label: 'Роль',
                    options: [
                      { value: 'EMPLOYEE', label: 'Сотрудник' },
                      { value: 'ADMIN', label: 'Администратор' },
                    ],
                  },
                ]}
              />
            </div>
          </div>
          <AdminPeople />
          <div className="admin-columns">
            <div className="admin-panel">
              <h2>Модерация публикаций</h2>
              {moderationError && (
                <p className="form-error">{moderationError}</p>
              )}
              {posts.data?.map((p) => (
                <div className="audit-row" key={p.id}>
                  <span>
                    <strong>{p.title}</strong>
                    <small style={{ display: 'block' }}>{p.author.name}</small>
                  </span>
                  <span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => moderate(p, 'pinned', !p.pinned)}
                    >
                      {p.pinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => moderate(p, 'published', !p.published)}
                    >
                      {p.published ? 'Скрыть' : 'Вернуть'}
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="admin-panel">
              <h2>Последние действия</h2>
              {q.data?.audit.length ? (
                q.data.audit.map((a) => (
                  <div className="audit-row" key={a.id}>
                    <span>
                      {a.action} · {a.entity}
                    </span>
                    <small>
                      <DateText
                        value={a.createdAt}
                        options={{
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }}
                      />
                    </small>
                  </div>
                ))
              ) : (
                <p className="muted">Действий пока нет</p>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

export function SettingsView() {
  const q = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<Person & { showBirthday: boolean; publicCelebrations: boolean }>(
        'auth/me',
      ),
  });
  const qc = useQueryClient();
  const [error, setError] = useState(''),
    [avatarFile, setAvatarFile] = useState<File | null>(null),
    [uploading, setUploading] = useState(false),
    [saved, setSaved] = useState(false),
    [passwordMessage, setPasswordMessage] = useState('');
  const save = async (
    key: 'showBirthday' | 'publicCelebrations',
    value: boolean,
  ) => {
    try {
      await send('auth/me/preferences', { [key]: value }, 'PATCH');
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['celebrations'] });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setPasswordMessage('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await send('auth/me/password', data, 'PATCH');
      setPasswordMessage('Пароль обновлён');
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const upload = async () => {
    if (!avatarFile) return;
    setError('');
    setUploading(true);
    setSaved(false);
    try {
      const form = new FormData();
      form.set('file', avatarFile);
      const updated = await api<{ publicId: string; avatarUrl: string }>(
        'auth/me/avatar',
        { method: 'POST', body: form },
      );
      qc.setQueryData(['me'], (current: Person | undefined) =>
        current ? { ...current, avatarUrl: updated.avatarUrl } : current,
      );
      void qc.invalidateQueries({ queryKey: ['person'] });
      setSaved(true);
      setAvatarFile(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <Page>
      <Intro
        eyebrow="ЛИЧНОЕ ПРОСТРАНСТВО"
        title="Настройки"
        subtitle="Управляйте тем, чем хотите делиться с коллегами."
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        q.data && (
          <div className="detail-card" style={{ maxWidth: 620 }}>
            <h2>Мой профиль</h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                margin: '20px 0 28px',
              }}
            >
              <Avatar person={q.data} size={75} />
              <div>
                <strong>{q.data.name}</strong>
                <p className="muted" style={{ margin: '5px 0 0' }}>
                  Добавьте фотографию, чтобы коллегам было проще вас узнать.
                </p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="avatar-upload">
                Фотография профиля · PNG или JPEG до 5 МБ
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button disabled={!avatarFile || uploading} onClick={upload}>
              Загрузить фото
            </Button>
            {saved && (
              <p style={{ color: 'var(--primary)', marginTop: 10 }}>
                Фотография обновлена
              </p>
            )}
            {error && <p className="form-error">{error}</p>}
            <h2 style={{ marginTop: 40 }}>Приватность</h2>
            <div
              className="detail-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 15,
              }}
            >
              <span>
                <strong>Показывать день рождения</strong>
                <small>Коллеги увидят только день и месяц</small>
              </span>
              <input
                type="checkbox"
                checked={q.data.showBirthday}
                onChange={(e) => save('showBirthday', e.target.checked)}
                aria-label="Показывать день рождения"
              />
            </div>
            <div
              className="detail-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 15,
              }}
            >
              <span>
                <strong>Публичные поздравления</strong>
                <small>События о вас появятся в общем разделе</small>
              </span>
              <input
                type="checkbox"
                checked={q.data.publicCelebrations}
                onChange={(e) => save('publicCelebrations', e.target.checked)}
                aria-label="Публичные поздравления"
              />
            </div>
            <h2 style={{ marginTop: 40 }}>Безопасность</h2>
            <form onSubmit={changePassword}>
              <div className="field">
                <label htmlFor="current-password">Текущий пароль</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">
                  Новый пароль · не менее 12 символов
                </label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  minLength={12}
                  required
                />
              </div>
              <Button type="submit">Обновить пароль</Button>
              {passwordMessage && (
                <p style={{ color: 'var(--primary)', marginTop: 10 }}>
                  {passwordMessage}
                </p>
              )}
            </form>
            <div style={{ marginTop: 25 }}>
              <Button
                variant="secondary"
                onClick={async () => {
                  await fetch('/api/logout', { method: 'POST' });
                  location.href = '/login';
                }}
              >
                Выйти из аккаунта
              </Button>
            </div>
          </div>
        )
      )}
    </Page>
  );
}

const loginSchema = z.object({
  email: z.email('Введите рабочий email'),
  password: z.string().min(1, 'Введите пароль'),
});
type LoginInput = z.infer<typeof loginSchema>;
export function LoginView() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const submit = async (data: LoginInput) => {
    setBusy(true);
    setError('');
    try {
      await send('auth/login', data);
      router.push('/');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-art">
        <BrandMark />
        <div>
          <span className="eyebrow login-eyebrow">
            min.Inside · ВНУТРИ КОМПАНИИ
          </span>
          <h1>
            Ближе к людям.
            <br />
            Ближе к важному.
          </h1>
        </div>
        <p>Место, где начинается каждый рабочий день.</p>
      </div>
      <div className="login-form-wrap">
        <div className="login-box">
          <span className="eyebrow">ДОБРО ПОЖАЛОВАТЬ</span>
          <h2>Рады видеть вас</h2>
          <p>
            Войдите с рабочим адресом, чтобы увидеть новости и возможности вашей
            команды.
          </p>
          <form onSubmit={form.handleSubmit(submit)}>
            <div className="field">
              <label htmlFor="email">Рабочий email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@min.ex"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <span className="form-error">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <span className="form-error">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              Войти <ArrowRight size={16} />
            </Button>
          </form>
          <div className="demo-note">
            <strong>Демонстрационный доступ</strong>
            <br />
            alex@min.ex или maria@min.ex
            <br />
            Пароль: Inside2026!
          </div>
        </div>
      </div>
    </div>
  );
}
