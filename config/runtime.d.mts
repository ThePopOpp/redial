export type Runtime = {
  deployment: 'local' | 'development'; siteUrl: string | null; username: string; password: string;
  secureCookies: boolean; dataDir: string;
  supabase: { url: string; publishableKey: string };
  twilio: { accountSid: string; authToken: string };
  email: { provider: 'disabled' | 'resend' | 'smtp'; from: string; resendKey: string;
    smtp: { host: string; port: number; secure: boolean; user: string; password: string } };
};
export function readRuntime(env?: NodeJS.ProcessEnv): Runtime;
export function configurationSummary(config: Runtime): Record<string, string>;
