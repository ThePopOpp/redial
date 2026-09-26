'use client';
import Link from 'next/link';
import { useState } from 'react';
import { views, labels } from '@/lib/dashboard/model';
import { Button } from '@/components/ui/button';
export function DashboardNavigation({workspace,line,view}:{workspace:string;line:string;view:string}) {
  const [open,setOpen]=useState(false);
  return <><Button className="review-menu" variant="outline" aria-expanded={open} aria-controls="dashboard-navigation" onClick={()=>setOpen(!open)}>Menu</Button><nav id="dashboard-navigation" aria-label="Workspace navigation" className={open?'is-open':''} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);(document.querySelector('.review-menu') as HTMLButtonElement)?.focus();}}}><p className="nav-caption">Your space</p>{views.map((v,i)=><Link key={v} href={`/app/${v}?workspace=${workspace}&line=${line}`} aria-current={v===view?'page':undefined} onClick={()=>setOpen(false)}>{labels[i]}</Link>)}<div className="sidebar-switch"><Link href="/">Back to website</Link><Link href="/account/password">Change password</Link></div></nav></>;
}
