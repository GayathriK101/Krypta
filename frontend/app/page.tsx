// Root page redirecting incoming visitors directly to the login page.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
