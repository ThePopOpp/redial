'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Home, LockKeyhole, MoreHorizontal, QrCode, RotateCcw, Share, Smartphone, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Device = 'Android' | 'iPhone';
const people = ['Jordan Miller', 'Sam Rivera', 'Alex Chen'];
const stages = ['Your phone', 'Open Redial', 'Sign in', 'Home screen', 'Contacts', 'Review', 'All set'];

export function PhoneSetupSimulator() {
  const [open, setOpen] = useState(false), [step, setStep] = useState(0);
  const [device, setDevice] = useState<Device>('Android'), [acted, setActed] = useState(false);
  const [selected, setSelected] = useState<number[]>([0]), [shortcut, setShortcut] = useState(false);
  function reset() { setStep(0); setActed(false); setSelected([0]); setShortcut(false); }
  function move(next: number) { setStep(next); setActed(false); }
  const titles = ['A little setup. A quieter day.', 'Open Redial on your phone.', 'Your account comes with you.', 'Keep Redial a tap away.', device === 'Android' ? 'Choose who comes with you.' : 'Bring over a contact file.', 'A quick look before you save.', 'You’ve walked through it.'];
  const descriptions = [
    'Choose your phone. We’ll show you how to open Redial, add a home-screen shortcut, and bring in your contacts.',
    'On your computer, open Contacts → From phone. Scan the QR with your phone camera, then open the link in your browser.',
    'Sign in with the same verified Redial account you use on your computer. The link takes you back to the selected workspace and line.',
    device === 'Android' ? 'In Chrome, open the ⋮ menu → Add to home screen → Create shortcut, then Add. You can also keep using Redial in your browser.' : 'In Safari, open Share → Add to Home Screen, then tap Add. Depending on your version, Share may be inside the More menu.',
    device === 'Android' ? 'Tap Select contacts in Redial. In a supported Android browser, your phone opens its own contact picker. Share one contact or select several. A vCard file works too.' : 'Export or share a vCard (.vcf) from Contacts, or export one from iCloud Contacts. In Redial, tap Choose .vcf file and select that file. The browser picker is not available on iPhone.',
    'Review the names and numbers you shared. Select one, several, or all eligible entries. Existing contacts are skipped and their call preferences stay unchanged.',
    'In the real flow, saved contacts appear on your phone and computer. This walkthrough used fictional people and did not change your device or your contact list.',
  ];
  const actionLabels = ['', 'Simulate scanning the QR', 'Simulate sign-in', 'Simulate adding shortcut', device === 'Android' ? 'Simulate sharing contacts' : 'Simulate choosing a vCard', `Simulate importing ${selected.length}`, ''];
  function act() { setActed(true); if (step === 3) setShortcut(true); }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) reset(); }}>
    <DialogTrigger asChild><Button variant="outline"><Smartphone size={16} />Phone setup simulator</Button></DialogTrigger>
    <DialogContent className="phone-wizard" data-step={step} data-device={device}>
      <header className="phone-wizard-header"><div><p className="phone-wizard-kicker">THE REDIAL WALKTHROUGH</p><DialogTitle>Set up on your phone</DialogTitle></div><Button variant="outline" aria-label="Close phone setup" onClick={() => setOpen(false)}><X size={18} /></Button></header>
      <DialogDescription className="phone-wizard-disclaimer">Interactive simulator · No installation, sign-in, or contact access happens here.</DialogDescription>
      <div className="phone-wizard-progress" role="progressbar" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={step+1} aria-label="Phone setup progress" aria-valuetext={`Step ${step + 1} of ${stages.length}: ${stages[step]}`}>{stages.map((label, index) => <span key={label} className={index <= step ? 'is-complete' : ''} aria-hidden="true" />)}</div>
      <div className="phone-wizard-body">
        <div className="phone-wizard-stage" role="img" aria-label={`Animated ${device} preview: ${stages[step]}${acted?' completed in simulation':''}`}>
          <div className="wizard-orbit" aria-hidden="true" />
          <div className="wizard-phone"><div className="wizard-phone-status" aria-hidden="true"><span>9:41</span><span className="wizard-phone-notch" /><span>••• ▰</span></div>
            <div className="wizard-phone-screen" key={`${step}-${device}-${acted}`}>
              <div className="wizard-phone-brand"><span>R</span> Redial <small>SIMULATED</small></div>
              {step === 0 && <div className="wizard-phone-center"><div className="wizard-app-icon">R</div><h3>Your phone.<br />Your space.</h3><p>{device} walkthrough</p><div className="wizard-mini-card"><CheckCircle2 size={18} /> At your own pace</div></div>}
              {step === 1 && (acted ? <div className="wizard-phone-center"><CheckCircle2 className="wizard-success-icon" size={48} /><h3>Link opened</h3><div className="wizard-mini-card"><LockKeyhole size={16} /> Redial · secure website</div></div> : <div className="wizard-phone-center"><p>Point your camera at the code</p><div className="wizard-scan-frame"><QrCode size={116} strokeWidth={1.4} /><span className="wizard-scan-line" /></div><small>Illustration only · not a scannable link</small><div className="wizard-tap-target">Open Redial <ArrowRight size={15} /></div></div>)}
              {step === 2 && <div className="wizard-phone-center"><LockKeyhole size={30} /><h3>{acted ? 'Welcome back.' : 'Welcome to Redial.'}</h3>{acted ? <div className="wizard-mini-card"><CheckCircle2 size={20} /> Example workspace</div> : <><div className="wizard-fake-field">alex@example.test</div><div className="wizard-fake-field">••••••••••••</div><div className="wizard-tap-target">Sign in</div><small>Example fields · no credentials needed</small></>}</div>}
              {step === 3 && <div className="wizard-phone-center">{acted ? <><div className="wizard-app-icon wizard-icon-land">R</div><h3>Redial</h3><p>Example home-screen shortcut</p></> : <><div className="wizard-app-icon">R</div><div className="wizard-browser-sheet"><div>{device === 'Android' ? <MoreHorizontal size={20} /> : <Share size={20} />} {device === 'Android' ? 'Chrome menu' : 'Safari · Share'}</div><div className="wizard-tap-target"><Home size={17} /> Add to Home Screen</div><small>A shortcut to the website</small></div></>}</div>}
              {step === 4 && <div className="wizard-phone-center"><h3>{device === 'Android' ? 'Share contacts' : 'Choose a file'}</h3>{device === 'Android' ? <div className="wizard-sample-list">{people.map((name,index)=><div style={{animationDelay:`${index*120}ms`}} key={name}><span className="wizard-initial">{name[0]}</span>{name}<Check size={15} /></div>)}</div> : <div className="wizard-file"><Upload size={32} /><strong>My contacts.vcf</strong><small>3 fictional contacts</small></div>}<div className={acted?'wizard-mini-card':'wizard-tap-target'}>{acted ? <><Check size={17} /> Ready to review</> : device==='Android'?'Share selected':'Choose .vcf file'}</div></div>}
              {step === 5 && <div className="wizard-phone-center"><h3>{acted?'Example import complete':'Your selection'}</h3><div className="wizard-sample-list">{people.map((name,index)=><div key={name} className={selected.includes(index)?'wizard-chosen':'wizard-unselected'}><span className="wizard-initial">{name[0]}</span>{name}{selected.includes(index)&&<Check size={15}/>}</div>)}</div><div className="wizard-mini-card">{acted?<CheckCircle2 size={18}/>:null}{selected.length} {acted?'simulated imports':'selected'}</div></div>}
              {step === 6 && <div className="wizard-phone-center"><CheckCircle2 size={60} className="wizard-success-icon"/><h3>A familiar start.</h3><p>{selected.length} example contacts</p><div className="wizard-mini-card">{shortcut?<Home size={18}/>:<Smartphone size={18}/>} {shortcut?'Shortcut demonstrated':'Browser access demonstrated'}</div><small>Calls and billing remain inactive.</small></div>}
            </div>{device==='Android'?<span className="wizard-android-nav" aria-hidden="true"><span/><span/><span/></span>:<span className="wizard-home-indicator" aria-hidden="true" />}
          </div><p className="wizard-preview-caption">{device} · animated example</p>
        </div>
        <section className="phone-wizard-instructions" aria-live="polite" aria-atomic="false"><p className="phone-wizard-kicker">{String(step+1).padStart(2,'0')} / {String(stages.length).padStart(2,'0')} · {stages[step]}</p><h3>{titles[step]}</h3><p>{descriptions[step]}</p>
          {step === 0 && <div className="wizard-device-choices" role="group" aria-label="Choose your phone">{(['Android','iPhone'] as const).map(name=><Button key={name} variant="outline" aria-pressed={device===name} onClick={()=>setDevice(name)}><Smartphone size={20}/><span>{name}<small>{name==='Android'?'Chrome browser':'Safari browser'}</small></span>{device===name&&<Check size={18}/>}</Button>)}</div>}
          {step === 1 && <p className="wizard-tip">For real setup, the QR must point to your hosted HTTPS site. A localhost address won’t open from another phone.</p>}
          {step === 3 && <p className="wizard-tip">Optional. Adding a shortcut does not install a native calling app or connect your phone line.</p>}
          {step === 5 && !acted && <div className="wizard-selection"><div className="actions"><Button variant="outline" onClick={()=>setSelected([0,1,2])}>Select all</Button><Button variant="outline" onClick={()=>setSelected([])}>Clear</Button></div>{people.map((name,index)=><label key={name}><Checkbox checked={selected.includes(index)} onCheckedChange={value=>setSelected(current=>value===true?[...current,index]:current.filter(item=>item!==index))}/><span>{name}<small>Fictional contact</small></span></label>)}</div>}
          {acted && <p className="wizard-action-result" role="status"><CheckCircle2 size={20}/> {step===5?`${selected.length} contacts imported in the simulation.`:'Example action complete. Continue when you’re ready.'}</p>}
          {step === 6 && <p className="wizard-tip">When you’re ready: configure your domain and Supabase, then use Contacts → From phone. Phone-line activation is a separate setup.</p>}
          <div className="wizard-step-action">{step>0&&step<6&&!acted?<Button disabled={step===5&&!selected.length} onClick={act}>{actionLabels[step]}<ArrowRight size={17}/></Button>:step===6?<Button variant="outline" onClick={reset}><RotateCcw size={17}/>Replay walkthrough</Button>:null}</div>
        </section>
      </div>
      <footer className="phone-wizard-footer"><Button variant="outline" disabled={step===0} onClick={()=>move(step-1)}><ArrowLeft size={16}/>Back</Button><span>Step {step+1} of {stages.length}</span><div className="actions">{step===3&&!acted&&<Button variant="outline" onClick={()=>{setShortcut(false);move(4);}}>Skip shortcut</Button>}<Button disabled={step>0&&step<6&&!acted} onClick={()=>step===6?setOpen(false):move(step+1)}>{step===6?'Finish':step===0?'Start walkthrough':'Continue'}{step!==6&&<ArrowRight size={16}/>}</Button></div></footer>
    </DialogContent>
  </Dialog>;
}
