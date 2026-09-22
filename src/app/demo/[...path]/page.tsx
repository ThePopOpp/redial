import { notFound } from 'next/navigation';
import { Overview, Callbacks } from '@/components/review/calls';
import { Agent, Contacts, Directory, People, Screening } from '@/components/review/configuration';
import { Billing, Companions, Connections, Help, Settings, Setup } from '@/components/review/account';
import { Live } from '@/components/review/live';
import { Operations } from '@/components/review/operations';

const operations = ['', 'customers', 'revenue', 'support', 'voice', 'features', 'crm', 'campaigns', 'content', 'agents', 'approvals', 'tasks', 'audit', 'settings'];
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (path === 'ops' || path.startsWith('ops/')) { const section = path.slice(4); if (!operations.includes(section)) notFound(); return <Operations section={section} />; }
  switch (path) {
    case 'overview': return <Overview />;
    case 'callbacks': return <Callbacks />;
    case 'screening': return <Screening />;
    case 'agent': return <Agent />;
    case 'directory': return <Directory />;
    case 'contacts': return <Contacts />;
    case 'people': return <People />;
    case 'billing': return <Billing />;
    case 'numbers': return <Setup />;
    case 'onboarding': return <Setup onboarding />;
    case 'connections': return <Connections />;
    case 'settings': return <Settings />;
    case 'help': return <Help />;
    case 'live': return <Live />;
    case 'mobile': return <Companions />;
    case 'extension': return <Companions extension />;
    default: notFound();
  }
}
