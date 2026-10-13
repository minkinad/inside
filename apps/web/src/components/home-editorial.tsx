'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Gift,
  MessageCircle,
  MessagesSquare,
  Network,
  Palette,
  Search,
  Settings2,
  Users,
} from 'lucide-react';
import {
  api,
  type Benefit,
  type Event,
  type Person,
  type Post,
} from '@/lib/api';
import {
  Avatar,
  DateText,
  Empty,
  ErrorBox,
  Loading,
  Shell,
  useSearchDialog,
} from './ui';

type HomeData = {
  me: { name: string };
  lead: Post | null;
  posts: Post[];
  newPeople: Person[];
  events: Event[];
  birthdays: (Person & {
    birthdayDay: number;
    birthdayMonth: number;
    daysUntil: number;
  })[];
  benefits: Benefit[];
};

const quickLinks = [
  { href: '/people', label: 'Люди', detail: 'Найти коллегу', Icon: Users },
  {
    href: '/org',
    label: 'Структура',
    detail: 'Команды и связи',
    Icon: Network,
  },
  {
    href: '/community',
    label: 'Сообщество',
    detail: 'Идеи и разговоры',
    Icon: MessagesSquare,
  },
  {
    href: '/celebrations',
    label: 'События',
    detail: 'Встречи и поводы',
    Icon: CalendarDays,
  },
  { href: '/benefits', label: 'Бонусы', detail: 'Для вас', Icon: Gift },
  { href: '/brand', label: 'Бренд', detail: 'Материалы', Icon: Palette },
  {
    href: '/settings',
    label: 'Мой min.Inside',
    detail: 'Профиль и настройки',
    Icon: Settings2,
  },
] as const;

const categories: Record<string, string> = {
  NEWS: 'Новости',
  DISCUSSION: 'Обсуждение',
  QUESTION: 'Вопрос',
  IDEA: 'Идея',
  ACHIEVEMENT: 'Достижение',
  EVENT: 'Событие',
  THANKS: 'Благодарность',
  SOCIAL: 'Общение',
};

const excerpt = (value: string, max = 150) =>
  value.length > max ? `${value.slice(0, max).trim()}…` : value;

export function HomeEditorialView() {
  const query = useQuery({
    queryKey: ['home'],
    queryFn: () => api<HomeData>('home'),
  });
  const showSearch = useSearchDialog((state) => state.show);
  const today = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const data = query.data;
  const lead = data?.lead ?? data?.posts[0] ?? null;
  const otherPosts =
    data?.posts.filter((post) => post.id !== lead?.id).slice(0, 3) ?? [];

  return (
    <Shell>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : data ? (
        <div className="experience-home">
          <section className="welcome-hero" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <div className="welcome-meta">
                <span>Внутри min.Inside</span>
                <time>{today}</time>
              </div>
              <h1 id="welcome-title">
                Здравствуйте,
                <br />
                {data.me.name.split(' ')[0]}.
              </h1>
              <p>Здесь люди, идеи и события, которые делают наш день общим.</p>
              <button
                type="button"
                className="hero-search"
                onClick={showSearch}
                aria-label="Открыть поиск"
              >
                <Search size={21} aria-hidden="true" />
                <span>Найти коллегу или публикацию</span>
                <kbd>⌘ K</kbd>
              </button>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="welcome-orbit welcome-orbit-one" />
              <div className="welcome-orbit welcome-orbit-two" />
              <span className="welcome-art-star">✳</span>
              <span className="welcome-art-caption">
                Ближе к людям.
                <br />
                Ближе к делу.
              </span>
            </div>
          </section>

          <nav className="home-destinations" aria-label="Быстрый доступ">
            {quickLinks.map(({ href, label, detail, Icon }) => (
              <Link href={href} key={href} className="destination-link">
                <span className="destination-icon">
                  <Icon size={23} strokeWidth={1.8} />
                </span>
                <strong>{label}</strong>
                <small>{detail}</small>
                <ArrowUpRight
                  size={15}
                  className="destination-arrow"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>

          <div className="home-content-grid">
            <section className="home-news" aria-labelledby="home-news-title">
              <div className="home-heading">
                <div>
                  <span className="eyebrow">ЖИЗНЬ КОМПАНИИ</span>
                  <h2 id="home-news-title">Что происходит внутри</h2>
                </div>
                <Link href="/community" className="text-link">
                  Все публикации <ArrowRight size={16} />
                </Link>
              </div>
              {lead ? (
                <article className="home-lead-story">
                  <div className="lead-story-copy">
                    <span className="lead-story-category">
                      {categories[lead.category] || lead.category}
                    </span>
                    <h3>
                      <Link href={`/community/${lead.id}`}>{lead.title}</Link>
                    </h3>
                    <p>{excerpt(lead.body, 210)}</p>
                    <div className="lead-story-footer">
                      <span className="lead-story-author">
                        <Avatar person={lead.author} size={31} />
                        {lead.author.name}
                      </span>
                      <Link
                        href={`/community/${lead.id}`}
                        aria-label={`Читать ${lead.title}`}
                      >
                        Читать историю <ArrowUpRight size={17} />
                      </Link>
                    </div>
                  </div>
                  <div className="lead-story-visual" aria-hidden="true">
                    <span>min.Inside</span>
                    <i>✳</i>
                  </div>
                </article>
              ) : (
                <Empty
                  title="Пока нет публикаций"
                  description="Откройте сообщество и начните разговор с коллегами."
                />
              )}
              {otherPosts.length > 0 && (
                <div className="home-story-list">
                  {otherPosts.map((post) => (
                    <article className="home-story-row" key={post.id}>
                      <div>
                        <small>
                          {categories[post.category] || post.category} ·{' '}
                          <DateText value={post.createdAt} />
                        </small>
                        <h3>
                          <Link href={`/community/${post.id}`}>
                            {post.title}
                          </Link>
                        </h3>
                        <span>
                          <MessageCircle size={14} /> {post._count.comments} ·{' '}
                          {post.author.name}
                        </span>
                      </div>
                      <Link
                        href={`/community/${post.id}`}
                        aria-label={`Читать ${post.title}`}
                      >
                        <ArrowUpRight size={19} />
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="home-today" aria-label="Рядом с вами">
              <section className="today-block">
                <div className="today-block-head">
                  <CalendarDays size={20} />
                  <span>Ближайшие события</span>
                </div>
                {data.events.length ? (
                  data.events.slice(0, 3).map((event) => (
                    <Link
                      href="/celebrations"
                      className="today-event"
                      key={event.id}
                    >
                      <time dateTime={event.startsAt}>
                        <strong>{new Date(event.startsAt).getDate()}</strong>
                        <small>
                          {new Intl.DateTimeFormat('ru-RU', {
                            month: 'short',
                          }).format(new Date(event.startsAt))}
                        </small>
                      </time>
                      <span>
                        <strong>{event.title}</strong>
                        <small>{event.location}</small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="muted">Ближайших событий пока нет.</p>
                )}
                <Link href="/celebrations" className="today-all">
                  Открыть календарь <ArrowRight size={15} />
                </Link>
              </section>
              <section className="today-block today-people">
                <div className="today-block-head">
                  <Users size={20} />
                  <span>Люди рядом</span>
                </div>
                {data.birthdays.length ? (
                  data.birthdays.slice(0, 2).map((person) => (
                    <Link
                      href={`/people/${person.publicId}`}
                      className="today-person"
                      key={person.publicId}
                    >
                      <Avatar person={person} size={36} />
                      <span>
                        <strong>{person.name}</strong>
                        <small>
                          {person.daysUntil === 0
                            ? 'День рождения сегодня'
                            : `День рождения через ${person.daysUntil} дн.`}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="muted">В ближайший месяц дней рождения нет.</p>
                )}
              </section>
            </aside>
          </div>

          <section
            className="home-new-people"
            aria-labelledby="home-people-title"
          >
            <div className="home-heading">
              <div>
                <span className="eyebrow">ЗНАКОМСТВО</span>
                <h2 id="home-people-title">Новые коллеги</h2>
              </div>
              <Link href="/people" className="text-link">
                Все люди <ArrowRight size={16} />
              </Link>
            </div>
            {data.newPeople.length ? (
              <div className="home-people-list">
                {data.newPeople.slice(0, 4).map((person) => (
                  <Link
                    href={`/people/${person.publicId}`}
                    className="home-person"
                    key={person.publicId}
                  >
                    <Avatar person={person} size={46} />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.title}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">Новых коллег пока нет.</p>
            )}
          </section>
        </div>
      ) : null}
    </Shell>
  );
}
