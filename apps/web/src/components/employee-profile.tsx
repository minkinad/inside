'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import { api, type Person } from '@/lib/api';
import { Avatar, DateText, ErrorBox, Loading, Shell } from './ui';

const careerLabels: Record<string, string> = {
  JOINED: 'Начало пути',
  PROMOTION: 'Повышение',
  TRANSFER: 'Переход в команду',
  ROLE_CHANGE: 'Новая роль',
  AWARD: 'Признание',
};

export function EmployeeProfileView() {
  const { number } = useParams<{ number: string }>();
  const publicId = `employee/${number}`;
  const query = useQuery({
    queryKey: ['person', publicId],
    queryFn: () => api<Person>(`people/${publicId}`),
  });
  const person = query.data;
  const career = person?.career ?? [];
  const hasJoinEvent = career.some((event) => event.kind === 'JOINED');

  return (
    <Shell>
      {query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : person ? (
        <div className="employee-profile">
          <Link href="/people" className="profile-back">
            <ArrowLeft size={16} /> Все сотрудники
          </Link>
          <header className="employee-profile-header">
            <div className="employee-portrait">
              <Avatar person={person} size={180} />
            </div>
            <div className="employee-identity">
              <span className="profile-kicker">В команде min.Inside</span>
              <h1>{person.name}</h1>
              <p className="employee-title">{person.title}</p>
              <div className="employee-tags">
                <span>
                  <Users size={15} /> {person.unit.name} / {person.team}
                </span>
                <span>
                  <MapPin size={15} /> {person.location}
                </span>
              </div>
              {person.manager && (
                <p className="employee-manager">
                  Руководитель{' '}
                  <Link href={`/people/${person.manager.publicId}`}>
                    {person.manager.name} <ArrowUpRight size={15} />
                  </Link>
                </p>
              )}
            </div>
            <div className="employee-id-panel">
              <small>Публичный ID</small>
              <code>{person.publicId}</code>
              {person.email && (
                <a href={`mailto:${person.email}`}>
                  <Mail size={16} /> Написать коллеге <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          </header>

          <div className="employee-profile-body">
            <div className="employee-profile-main">
              <section
                className="employee-section employee-intro"
                aria-labelledby="employee-about"
              >
                <div className="employee-section-heading">
                  <h2 id="employee-about">О сотруднике</h2>
                </div>
                <p>{person.bio || 'Коллега пока не добавил рассказ о себе.'}</p>
              </section>

              <section
                className="employee-section"
                aria-labelledby="employee-focus"
              >
                <div className="employee-section-heading">
                  <h2 id="employee-focus">Рабочий фокус</h2>
                </div>
                <div className="employee-focus">
                  <div className="focus-icon">
                    <BriefcaseBusiness size={23} />
                  </div>
                  <div>
                    <strong>{person.title}</strong>
                    <p>
                      {person.team} · {person.unit.name}
                    </p>
                  </div>
                </div>
                <h3 className="profile-subheading">Навыки и экспертиза</h3>
                {person.skills?.length ? (
                  <div className="employee-skills">
                    {person.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Навыки пока не указаны.</p>
                )}
              </section>

              <section
                className="employee-section"
                aria-labelledby="employee-career"
              >
                <div className="employee-section-heading">
                  <h2 id="employee-career">Путь в min.Inside</h2>
                </div>
                <div className="employee-timeline">
                  {career.map((event) => (
                    <div className="employee-milestone" key={event.id}>
                      <time dateTime={event.date}>
                        <DateText
                          value={event.date}
                          options={{ month: 'long', year: 'numeric' }}
                        />
                      </time>
                      <div>
                        <small>
                          {careerLabels[event.kind] || 'Событие карьеры'}
                        </small>
                        <h3>{event.title}</h3>
                        {event.detail && <p>{event.detail}</p>}
                      </div>
                    </div>
                  ))}
                  {!hasJoinEvent && (
                    <div className="employee-milestone">
                      <time dateTime={person.joinedAt}>
                        <DateText
                          value={person.joinedAt}
                          options={{ month: 'long', year: 'numeric' }}
                        />
                      </time>
                      <div>
                        <small>Начало пути</small>
                        <h3>Присоединился к min.Inside</h3>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {person.posts && person.posts.length > 0 && (
                <section
                  className="employee-section"
                  aria-labelledby="employee-posts"
                >
                  <div className="employee-section-heading">
                    <h2 id="employee-posts">Публикации</h2>
                  </div>
                  <div className="employee-posts">
                    {person.posts.map((post) => (
                      <Link href={`/community/${post.id}`} key={post.id}>
                        {post.title}
                        <ArrowRight size={17} />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside
              className="employee-profile-aside"
              aria-label="Дополнительная информация"
            >
              <section className="profile-info-panel">
                <h2>Контакты</h2>
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="profile-contact"
                  >
                    <Mail size={18} />
                    <span>
                      <small>Рабочая почта</small>
                      <strong>{person.email}</strong>
                    </span>
                  </a>
                )}
                {person.phone && (
                  <a href={`tel:${person.phone}`} className="profile-contact">
                    <Phone size={18} />
                    <span>
                      <small>Телефон</small>
                      <strong>{person.phone}</strong>
                    </span>
                  </a>
                )}
                <div className="profile-contact">
                  <MapPin size={18} />
                  <span>
                    <small>Локация</small>
                    <strong>{person.location}</strong>
                  </span>
                </div>
              </section>
              <section className="profile-info-panel">
                <h2>В компании</h2>
                <div className="profile-contact">
                  <CalendarDays size={18} />
                  <span>
                    <small>С нами с</small>
                    <strong>
                      <DateText
                        value={person.joinedAt}
                        options={{ month: 'long', year: 'numeric' }}
                      />
                    </strong>
                  </span>
                </div>
                <div className="profile-contact">
                  <Users size={18} />
                  <span>
                    <small>Команда</small>
                    <strong>{person.team}</strong>
                  </span>
                </div>
              </section>
              {person.interests && person.interests.length > 0 && (
                <section className="profile-info-panel">
                  <h2>Вне работы</h2>
                  <div className="employee-interests">
                    {person.interests.map((interest) => (
                      <span key={interest}>{interest}</span>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
