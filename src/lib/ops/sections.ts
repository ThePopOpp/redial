// The ops console is a registry, not a switch. Adding a section is one entry
// here plus one folder under src/app/ops. Unknown paths 404 from the router.
export const staffCapabilities = [
  'support_read', 'support_write', 'customer_read', 'customer_admin',
  'billing_read', 'billing_write', 'refund_approve',
  'reminder_send', 'reminder_approve', 'jobs_admin', 'staff_admin', 'audit_read',
] as const;
export type StaffCapability = typeof staffCapabilities[number];

export type OpsSection = Readonly<{ slug: string; label: string; capability?: StaffCapability; description: string }>;

export const opsSections: readonly OpsSection[] = [
  { slug: '', label: 'Overview', description: 'Platform totals and what needs attention.' },
  { slug: 'customers', label: 'Customers', capability: 'customer_read', description: 'Every workspace, its people, lines and membership.' },
  { slug: 'support', label: 'Support', capability: 'support_read', description: 'Member requests and staff replies.' },
  { slug: 'staff', label: 'Staff & access', capability: 'staff_admin', description: 'Who holds a platform role, and what it grants.' },
  { slug: 'audit', label: 'Activity', capability: 'audit_read', description: 'Recorded platform and workspace actions.' },
];

export function sectionHref(slug: string) { return slug ? `/ops/${slug}` : '/ops'; }

export function visibleSections(capabilities: readonly string[]) {
  return opsSections.filter(section => !section.capability || capabilities.includes(section.capability));
}
