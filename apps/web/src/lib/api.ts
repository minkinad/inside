export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/inside/${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !location.pathname.startsWith('/login')
  ) {
    location.href = '/login';
    throw new Error('Сессия истекла');
  }
  if (!response.ok) {
    let message = 'Не удалось выполнить запрос';
    try {
      const data = await response.json();
      message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
export const send = <T>(path: string, data: unknown, method = 'POST') =>
  api<T>(path, { method, body: JSON.stringify(data) });
export type Person = {
  publicId: string;
  name: string;
  title: string;
  team: string;
  location: string;
  avatarUrl?: string;
  joinedAt: string;
  unit: { id: string; name: string };
  email?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  coverUrl?: string;
  manager?: Person;
  career?: Career[];
  posts?: Pick<Post, 'id' | 'title' | 'category' | 'createdAt'>[];
};
export type Career = {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  date: string;
};
export type Post = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  category: string;
  createdAt: string;
  pinned: boolean;
  published: boolean;
  author: Person;
  _count: { comments: number; reactions: number };
  comments?: Comment[];
};
export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  parentId?: string;
  author: Person;
};
export type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  link?: string;
};
export type Benefit = {
  id: string;
  category: string;
  title: string;
  description: string;
  eligibility: string;
  instruction: string;
  contact: string;
  serviceUrl?: string;
};
export type Celebration = {
  id: string;
  kind: string;
  title: string;
  date: string;
  employee: Person;
  _count: { comments: number; reactions: number };
  comments: Comment[];
};
export type Asset = {
  id: string;
  title: string;
  category: string;
  description: string;
  usage: string;
  version: string;
  mimeType: string;
  size: number;
  updatedAt: string;
};
