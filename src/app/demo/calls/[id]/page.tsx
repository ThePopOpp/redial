import { CallDetail } from '@/components/review/calls';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CallDetail id={(await params).id} />; }
