import Link from 'next/link';

export function Brand() {
  return <Link className="brand" href="/" aria-label="Redial home"><span className="brand-mark" aria-hidden="true">R</span><span>Redial</span></Link>;
}
