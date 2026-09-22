import type { Metadata } from 'next';
import { LandingExperience } from '@/components/landing/experience';
import './landing.css';
import './motion.css';
import './story-interactions.css';
export const metadata: Metadata = { title: 'Your calls. Your day. Your choice.', description: 'Follow a Redial call from the first hello to a useful next step. Explore Insider, Gavel, Audible and Directory, then begin your personal setup.' };
export default function Home() { return <LandingExperience />; }
