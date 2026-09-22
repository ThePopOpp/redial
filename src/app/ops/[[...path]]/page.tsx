import { redirect } from 'next/navigation';

// Member/tenant-admin identity never implies a platform staff role.
// Staff access must remain closed until separate role and MFA checks exist.
export default function StaffBoundary(): never { redirect('/staff-sign-in'); }
