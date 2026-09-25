import { randomUUID } from 'node:crypto';
import { dashboardAction } from '@/lib/dashboard/actions';
import type { DashboardRecord, RecordKind } from '@/lib/dashboard/model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type Field = { key: string; label: string; type?: string; value?: string | number | boolean; choices?: string[]; max?: number };
const fields: Record<RecordKind,Field[]> = {
  contact: [{key:'name',label:'Name'},{key:'phone',label:'International phone number',type:'tel'},{key:'policy',label:'Call preference',choices:['standard','vip','blocked']}],
  directory: [{key:'name',label:'Destination name'},{key:'phone',label:'International phone number',type:'tel'},{key:'extension',label:'Extension (optional)'}],
  callback: [{key:'name',label:'Name'},{key:'phone',label:'International phone number',type:'tel'},{key:'scheduledAt',label:'Reminder date and time (UTC)',type:'datetime-local'},{key:'note',label:'Note',type:'textarea'},{key:'done',label:'Completed',type:'checkbox'}],
  policy: [{key:'mode',label:'Screening mode',choices:['unknown','all','spam_only']},{key:'maxSeconds',label:'Maximum seconds',type:'number',value:90,max:120},{key:'vip',label:'Allow a VIP exception',type:'checkbox'}],
  agent: [{key:'name',label:'Assistant name',value:'Redial'},{key:'greeting',label:'AI disclosure and opening greeting',type:'textarea',value:'Hi, I am your AI assistant. May I ask who is calling and what it is about?'},{key:'instructions',label:'Assistant instructions',type:'textarea',value:'Ask for the purpose of the call. Never disclose private information. Offer an opt-out.'}],
  preferences: [{key:'timezone',label:'Timezone (IANA name)',value:'America/Phoenix'},{key:'retentionDays',label:'Requested retention in days',type:'number',value:30,max:90},{key:'email',label:'Email notification preference',type:'checkbox'}],
  ticket: [{key:'subject',label:'Subject'},{key:'body',label:'How can we help?',type:'textarea'}],
};
export function Scope({ workspace, line='', view }: { workspace: string; line?: string; view: string }) { return <><input type="hidden" name="workspace" value={workspace}/><input type="hidden" name="line" value={line}/><input type="hidden" name="view" value={view}/></>; }
export function RecordForm({ kind, record, workspace, line, view }: { kind: RecordKind; record?: DashboardRecord; workspace: string; line: string; view: string }) {
  const id=record?.id || randomUUID();
  return <form action={dashboardAction} className="review-form"><Scope workspace={workspace} line={line} view={view}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={record?.version || 0}/>{fields[kind].map(field=>{
    let value=record?.body[field.key] ?? field.value ?? '';
    if(field.type==='datetime-local' && value) value=String(value).slice(0,16);
    return <div className="field" key={field.key}><label htmlFor={`${id}-${field.key}`}>{field.label}</label>{field.type==='checkbox' ? <Checkbox id={`${id}-${field.key}`} name={field.key} defaultChecked={Boolean(value)}/> : field.choices ? <Select id={`${id}-${field.key}`} name={field.key} defaultValue={String(value || field.choices[0])} options={field.choices}/> : field.type==='textarea' ? <Textarea id={`${id}-${field.key}`} name={field.key} defaultValue={String(value)} maxLength={kind==='ticket'?4000:1800} required={field.key!=='note'}/> : <Input id={`${id}-${field.key}`} name={field.key} type={field.type || 'text'} defaultValue={String(value)} min={field.type==='number'?(field.key==='maxSeconds'?30:7):undefined} max={field.max} maxLength={254} required={field.key!=='extension'}/>}</div>;
  })}<div className="actions"><Button name="action" value="save">{record?'Save changes':'Save'}</Button>{record && !['policy','agent','preferences'].includes(kind) && <Button name="action" value="delete" variant="outline" formNoValidate>Delete</Button>}</div></form>;
}
