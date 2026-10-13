'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Users,
  Network,
  MessagesSquare,
  Gift,
  Palette,
  CalendarDays,
  Settings,
  ShieldCheck,
  Search,
  Sun,
  Moon,
  X,
  Sparkles,
  ArrowRight,
  Bell,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { create } from 'zustand';
import {
  api,
  type Asset,
  type Benefit,
  type Person,
  type Post,
} from '@/lib/api';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './dialog';
import { BrandMark } from './brand-mark';

type ThemeStore = {
  dark: boolean;
  toggle: () => void;
  set: (dark: boolean) => void;
};
export const useTheme = create<ThemeStore>((set) => ({
  dark: false,
  toggle: () => set((s) => ({ dark: !s.dark })),
  set: (dark) => set({ dark }),
}));
type SearchStore = {
  open: boolean;
  trigger: HTMLElement | null;
  show: () => void;
  hide: () => void;
};
export const useSearchDialog = create<SearchStore>((set) => ({
  open: false,
  trigger: null,
  show: () =>
    set({
      open: true,
      trigger:
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    }),
  hide: () => set({ open: false }),
}));
export function Avatar({
  person,
  size = 44,
}: {
  person: Pick<Person, 'name' | 'avatarUrl'>;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return person.avatarUrl && person.avatarUrl !== failedUrl ? (
    <img
      className="avatar"
      src={person.avatarUrl}
      alt={person.name}
      width={size}
      height={size}
      style={{
        width: `var(--avatar-width, ${size}px)`,
        height: `var(--avatar-height, ${size}px)`,
      }}
      onError={() => setFailedUrl(person.avatarUrl || null)}
    />
  ) : (
    <span
      className="avatar initials"
      style={{
        width: `var(--avatar-width, ${size}px)`,
        height: `var(--avatar-height, ${size}px)`,
        fontSize: `var(--avatar-font-size, ${size * 0.34}px)`,
      }}
    >
      {person.name
        .split(' ')
        .map((v) => v[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>(function Button({ children, variant = 'primary', ...props }, ref) {
  return (
    <button
      type="button"
      ref={ref}
      {...props}
      className={`btn btn-${variant} ${props.className || ''}`}
    >
      {children}
    </button>
  );
});
export function Empty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Sparkles size={25} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status" aria-label="Загрузка">
      <span />
      <span />
      <span />
    </div>
  );
}
export function ErrorBox({ error }: { error: Error }) {
  return (
    <div className="errorbox" role="alert">
      <strong>Не удалось загрузить раздел</strong>
      <p>{error.message}</p>
      <Button variant="secondary" onClick={() => location.reload()}>
        Повторить
      </Button>
    </div>
  );
}
export function SectionHead({
  eyebrow,
  title,
  href,
  label,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          {label || 'Смотреть все'} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
const nav = [
  ['/', 'Компания', Home],
  ['/people', 'Люди', Users],
  ['/org', 'Структура', Network],
  ['/community', 'Сообщество', MessagesSquare],
  ['/celebrations', 'События', CalendarDays],
  ['/benefits', 'Бонусы', Gift],
  ['/brand', 'Бренд', Palette],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const {
    data: me,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Person & { role: string }>('auth/me'),
  });
  const [notice, setNotice] = useState(false),
    [more, setMore] = useState(false),
    [ecosystemOpen, setEcosystemOpen] = useState(false);
  const search = useSearchDialog((state) => state.open);
  const showSearch = useSearchDialog((state) => state.show);
  const hideSearch = useSearchDialog((state) => state.hide);
  const previousPath = useRef(path);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const ecosystemRef = useRef<HTMLDivElement>(null);
  const ecosystemTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setMore(false);
    setTimeout(() => menuTrigger.current?.focus(), 0);
  };
  const closeSearch = () => {
    const trigger = useSearchDialog.getState().trigger;
    hideSearch();
    setTimeout(() => trigger?.focus(), 0);
  };
  const noticeData = useQuery({
    queryKey: ['home'],
    queryFn: () =>
      api<{
        events: { id: string; title: string; startsAt: string }[];
        birthdays: {
          publicId: string;
          name: string;
          birthdayDay: number;
          birthdayMonth: number;
        }[];
      }>('home'),
    enabled: notice,
  });
  const { dark, toggle, set } = useTheme();
  useEffect(() => {
    set(localStorage.getItem('inside_theme') === 'dark');
  }, [set]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('inside_theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        showSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSearch]);
  useEffect(() => {
    if (previousPath.current !== path) {
      previousPath.current = path;
      setMore(false);
      setEcosystemOpen(false);
    }
  }, [path]);
  useEffect(() => {
    if (!more) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMore(false);
        menuTrigger.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [more]);
  useEffect(() => {
    if (!ecosystemOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !ecosystemRef.current?.contains(event.target)
      ) {
        setEcosystemOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEcosystemOpen(false);
        ecosystemTrigger.current?.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !ecosystemRef.current?.contains(event.target)
      ) {
        setEcosystemOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [ecosystemOpen]);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1121px)');
    const closeOnWide = () => {
      if (wide.matches) setMore(false);
    };
    wide.addEventListener('change', closeOnWide);
    return () => wide.removeEventListener('change', closeOnWide);
  }, []);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error as Error} />;
  if (!me) return null;
  return (
    <div className="app-shell">
      <div className="main-area">
        <header className="topbar site-header">
          <div className="header-brand" ref={ecosystemRef}>
            <BrandMark linked />
            <button
              type="button"
              ref={ecosystemTrigger}
              className="ecosystem-trigger"
              aria-label="Продукты min"
              aria-expanded={ecosystemOpen}
              aria-controls="ecosystem-products"
              onClick={() => setEcosystemOpen((value) => !value)}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {ecosystemOpen && (
              <div className="ecosystem-panel" id="ecosystem-products">
                <span className="ecosystem-label">Экосистема min</span>
                <Link
                  href="/"
                  aria-current="true"
                  onClick={() => setEcosystemOpen(false)}
                >
                  <strong>min.Inside</strong>
                  <small>Текущий продукт</small>
                </Link>
                {['min:Ecosys', 'min:Dev', 'min:Infra'].map((name) => (
                  <div className="ecosystem-future" key={name}>
                    <strong>{name}</strong>
                    <small>Скоро</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <nav className="site-nav" aria-label="Основная навигация">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}`}
                aria-current={
                  path === href || (href !== '/' && path.startsWith(href))
                    ? 'page'
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="topbar-actions">
            <button
              type="button"
              className="search-trigger"
              aria-label="Поиск по min.Inside"
              onClick={showSearch}
            >
              <Search size={17} />
              <span>Поиск</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Сменить тему"
              aria-pressed={dark}
              onClick={toggle}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              type="button"
              className="icon-button notification-button"
              aria-label="Уведомления"
              aria-expanded={notice}
              aria-controls="inside-notifications"
              onClick={() => {
                setNotice(!notice);
                setMore(false);
              }}
            >
              <Bell size={19} />
              <i />
            </button>
            {me.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="icon-button utility-link"
                aria-label="Управление"
              >
                <ShieldCheck size={19} />
              </Link>
            )}
            <Link
              href="/settings"
              className="icon-button utility-link"
              aria-label="Настройки"
            >
              <Settings size={19} />
            </Link>
            <Link
              href={`/people/${me.publicId}`}
              className="top-avatar"
              aria-label="Мой профиль"
            >
              <Avatar person={me} size={34} />
            </Link>
            <button
              type="button"
              ref={menuTrigger}
              className="icon-button menu-trigger"
              aria-label="Все разделы"
              aria-controls="mobile-more"
              aria-expanded={more}
              onClick={() => {
                setMore((value) => !value);
                setNotice(false);
              }}
            >
              {more ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>
        {more && (
          <section
            className="mobile-more"
            id="mobile-more"
            aria-label="Все разделы"
          >
            <div className="mobile-more-head">
              <strong>Разделы min.Inside</strong>
              <button
                type="button"
                className="icon-button"
                onClick={closeMenu}
                aria-label="Закрыть меню"
              >
                <X size={20} />
              </button>
            </div>
            {nav.map(([href, label, Icon]) => (
              <Link href={href} key={href} onClick={() => setMore(false)}>
                <Icon size={19} />
                {label}
                <ArrowRight size={16} />
              </Link>
            ))}
            <Link href="/settings" onClick={() => setMore(false)}>
              <Settings size={19} />
              Настройки
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              className="mobile-more-action"
              onClick={toggle}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
              {dark ? 'Светлая тема' : 'Тёмная тема'}
              <ArrowRight size={16} />
            </button>
            {me.role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setMore(false)}>
                <ShieldCheck size={19} />
                Управление
                <ArrowRight size={16} />
              </Link>
            )}
          </section>
        )}
        {notice && (
          <div className="notification-panel" id="inside-notifications">
            <strong>Скоро в min.Inside</strong>
            {noticeData.isLoading ? (
              <p>Загрузка…</p>
            ) : noticeData.data?.events.length ||
              noticeData.data?.birthdays.length ? (
              <>
                <p>Ближайшие события и поводы поздравить коллег:</p>
                {noticeData.data?.events.slice(0, 2).map((e) => (
                  <Link
                    href="/celebrations"
                    key={e.id}
                    className="mini-person"
                    onClick={() => setNotice(false)}
                  >
                    <CalendarDays size={16} />
                    <span>
                      <strong>{e.title}</strong>
                      <small>
                        {new Intl.DateTimeFormat('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(e.startsAt))}
                      </small>
                    </span>
                  </Link>
                ))}
                {noticeData.data?.birthdays.slice(0, 2).map((p) => (
                  <Link
                    href={`/people/${p.publicId}`}
                    key={p.publicId}
                    className="mini-person"
                    onClick={() => setNotice(false)}
                  >
                    <Sparkles size={16} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        День рождения · {p.birthdayDay}.{p.birthdayMonth}
                      </small>
                    </span>
                  </Link>
                ))}
              </>
            ) : (
              <p>Пока ничего нового</p>
            )}
          </div>
        )}
        <main>{children}</main>
        <footer className="footer">min.Inside · пространство команды</footer>
      </div>
      <SearchDialog open={search} onClose={closeSearch} />
    </div>
  );
}
function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  const router = useRouter();
  const people = useQuery({
    queryKey: ['search-people', query],
    queryFn: () =>
      api<{ items: Person[] }>(
        `people?search=${encodeURIComponent(query)}&take=5`,
      ),
    enabled: query.length >= 2,
  });
  const posts = useQuery({
    queryKey: ['search-posts', query],
    queryFn: () =>
      api<{ items: Post[] }>(
        `posts?search=${encodeURIComponent(query)}&take=4`,
      ),
    enabled: query.length >= 2,
  });
  const assets = useQuery({
    queryKey: ['search-assets', query],
    queryFn: () => api<Asset[]>(`brand?search=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
  const benefits = useQuery({
    queryKey: ['search-benefits'],
    queryFn: () => api<Benefit[]>('benefits'),
    enabled: query.length >= 2,
  });
  const benefitMatches = benefits.data
    ?.filter((item) =>
      `${item.title} ${item.category} ${item.description}`
        .toLocaleLowerCase('ru-RU')
        .includes(query.toLocaleLowerCase('ru-RU')),
    )
    .slice(0, 3);
  const searchError =
    people.error || posts.error || assets.error || benefits.error;
  const go = (url: string) => {
    onClose();
    router.push(url);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="search-dialog" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Поиск по min.Inside</DialogTitle>
        <div className="search-input-row">
          <Search size={22} aria-hidden="true" />
          <input
            autoFocus
            aria-label="Поисковый запрос"
            placeholder="Люди, публикации, материалы..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <DialogClose asChild>
            <button type="button" className="icon-button" aria-label="Закрыть">
              <X size={19} />
            </button>
          </DialogClose>
        </div>
        {query.length < 2 ? (
          <div className="search-hint">Начните вводить имя или тему</div>
        ) : (
          <div className="search-results" aria-live="polite">
            <small>ЛЮДИ</small>
            {people.data?.items.map((p) => (
              <button
                type="button"
                key={p.publicId}
                onClick={() => go(`/people/${p.publicId}`)}
              >
                <Avatar person={p} size={32} />
                <span>
                  {p.name}
                  <em>{p.title}</em>
                </span>
              </button>
            ))}
            <small>ПУБЛИКАЦИИ</small>
            {posts.data?.items.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => go(`/community/${p.id}`)}
              >
                <MessagesSquare size={18} aria-hidden="true" />
                <span>
                  {p.title}
                  <em>{p.author.name}</em>
                </span>
              </button>
            ))}
            <small>БРЕНД-МАТЕРИАЛЫ</small>
            {assets.data?.slice(0, 3).map((asset) => (
              <button type="button" key={asset.id} onClick={() => go('/brand')}>
                <Palette size={18} aria-hidden="true" />
                <span>
                  {asset.title}
                  <em>{asset.category}</em>
                </span>
              </button>
            ))}
            <small>БОНУСЫ</small>
            {benefitMatches?.map((benefit) => (
              <button
                type="button"
                key={benefit.id}
                onClick={() => go('/benefits')}
              >
                <Gift size={18} aria-hidden="true" />
                <span>
                  {benefit.title}
                  <em>{benefit.category}</em>
                </span>
              </button>
            ))}
            {searchError && (
              <p role="alert">
                Часть результатов недоступна. Попробуйте поиск ещё раз.
              </p>
            )}
            {people.isFetching ||
            posts.isFetching ||
            assets.isFetching ||
            benefits.isFetching ? (
              <p>Ищем…</p>
            ) : !searchError &&
              !people.data?.items.length &&
              !posts.data?.items.length &&
              !assets.data?.length &&
              !benefitMatches?.length ? (
              <p>Ничего не найдено. Попробуйте другое имя или тему.</p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function DateText({
  value,
  options,
}: {
  value: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  return (
    <>
      {new Intl.DateTimeFormat(
        'ru-RU',
        options || { day: 'numeric', month: 'long' },
      ).format(new Date(value))}
    </>
  );
}
