import { redirect } from 'next/navigation';

export default function LegacyProfile() {
  redirect('/people');
}
