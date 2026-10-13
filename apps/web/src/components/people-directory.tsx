'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  List,
  Search,
  UsersRound,
} from 'lucide-react';
import { api, type Person } from '@/lib/api';
import { Avatar, Empty, ErrorBox, Loading, Shell } from './ui';

type Org = {
  units: { id: string; name: string; parentId: string | null }[];
  people: Person[];
};

export function PeopleDirectoryView() {
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('');
  const [team, setTeam] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const people = useQuery({
    queryKey: ['people', search, unit, team],
    queryFn: () =>
      api<{ items: Person[]; total: number }>(
        `people?search=${encodeURIComponent(search)}&unitId=${encodeURIComponent(unit)}&team=${encodeURIComponent(team)}&take=40`,
      ),
  });
  const org = useQuery({ queryKey: ['org'], queryFn: () => api<Org>('org') });
  const teams = useMemo(
    () =>
      [...new Set(org.data?.people.map((person) => person.team) || [])].sort(),
    [org.data],
  );
  const items = people.data?.items || [];

  return (
    <Shell>
      <div className="directory-intro">
        <div>
          <span className="eyebrow">ЛЮДИ / min.Inside</span>
          <h1>
            Люди делают
            <br />
            <em>min.Inside</em>
          </h1>
          <p>
            Найдите коллегу, узнайте, чем живёт команда, и начните разговор.
          </p>
        </div>
        <div className="directory-count">
          <UsersRound size={21} />
          <strong>{org.data?.people.length ?? '—'}</strong>
          <span>коллег в компании</span>
        </div>
      </div>

      <section className="directory-workspace" aria-label="Каталог сотрудников">
        <div className="directory-workspace-head">
          <div>
            <span className="eyebrow">КАТАЛОГ КОМАНДЫ</span>
            <h2>Все коллеги</h2>
          </div>
          <Link href="/org" className="text-link">
            Посмотреть структуру <ArrowRight size={17} />
          </Link>
        </div>
        <div className="directory-controls">
          <label className="directory-search">
            <Search size={18} />
            <input
              aria-label="Поиск сотрудников"
              placeholder="Имя, роль или команда"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>⌕</kbd>
          </label>
          <select
            aria-label="Подразделение"
            value={unit}
            onChange={(event) => {
              setUnit(event.target.value);
              setTeam('');
            }}
          >
            <option value="">Все подразделения</option>
            {org.data?.units
              .filter((value) => value.parentId !== null)
              .map((value) => (
                <option value={value.id} key={value.id}>
                  {value.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Команда"
            value={team}
            onChange={(event) => setTeam(event.target.value)}
          >
            <option value="">Все команды</option>
            {teams.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
          <div
            className="directory-view"
            role="toolbar"
            aria-label="Вид каталога"
          >
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              aria-label="Список"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={18} />
            </button>
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              aria-label="Карточки"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
        <div
          className="directory-teams"
          role="toolbar"
          aria-label="Фильтр по команде"
        >
          <button
            type="button"
            className={team === '' ? 'active' : ''}
            onClick={() => setTeam('')}
          >
            Все команды <span>{org.data?.people.length ?? '—'}</span>
          </button>
          {teams.map((value) => (
            <button
              type="button"
              key={value}
              className={team === value ? 'active' : ''}
              onClick={() => setTeam(value)}
            >
              {value}{' '}
              <span>
                {
                  org.data?.people.filter((person) => person.team === value)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
        <div className="directory-result">
          <span>
            {people.data
              ? `${people.data.total} ${people.data.total === 1 ? 'человек' : 'коллег'}`
              : 'Загрузка…'}
          </span>
          <span>{view === 'list' ? 'СПИСОК' : 'КАРТОЧКИ'} / A–Я</span>
        </div>
        {people.isLoading ? (
          <Loading />
        ) : people.error ? (
          <ErrorBox error={people.error} />
        ) : items.length === 0 ? (
          <Empty
            title="Коллеги не найдены"
            description="Измените запрос или фильтр"
          />
        ) : view === 'list' ? (
          <div className="directory-list">
            <div className="directory-columns" aria-hidden="true">
              <span>КОЛЛЕГА</span>
              <span>КОМАНДА</span>
              <span>ГОРОД</span>
              <span />
            </div>
            {items.map((person) => (
              <Link
                href={`/people/${person.publicId}`}
                className="directory-person"
                key={person.publicId}
              >
                <div className="directory-identity">
                  <Avatar person={person} size={45} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>{person.title}</small>
                  </span>
                </div>
                <span className="directory-team">
                  {person.unit.name}
                  <small>{person.team}</small>
                </span>
                <span className="directory-location">{person.location}</span>
                <ArrowUpRight className="directory-arrow" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="directory-grid">
            {items.map((person) => (
              <Link
                href={`/people/${person.publicId}`}
                className="directory-card"
                key={person.publicId}
              >
                <div className="directory-card-top">
                  <Avatar person={person} size={49} />
                  <ArrowUpRight size={18} />
                </div>
                <strong>{person.name}</strong>
                <p>{person.title}</p>
                <div>
                  <span>
                    {person.unit.name} · {person.team}
                  </span>
                  <small>{person.location}</small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
