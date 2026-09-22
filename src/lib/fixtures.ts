export type DemoCall = Readonly<{
  kind: 'synthetic';
  id: string;
  caller: string;
  time: string;
  purpose: string;
  summary: string;
  transcript: readonly Readonly<{ speaker: 'Redial agent' | 'Caller'; text: string }>[];
}>;

// Original synthetic content. Never used as fallback for a failed real query.
export const demoCalls: readonly DemoCall[] = [{
  kind: 'synthetic',
  id: 'delivery-example',
  caller: 'Jordan · Delivery company',
  time: '14:20',
  purpose: 'Delivery window',
  summary: 'Jordan would like to confirm a delivery window. A callback was requested; no time was confirmed.',
  transcript: [
    { speaker: 'Redial agent', text: "Hi, you've reached Alex's AI assistant. May I ask who's calling and what this is about?" },
    { speaker: 'Caller', text: "This is Jordan from the delivery company. I'd like to confirm a delivery window." },
    { speaker: 'Redial agent', text: "I can pass that request along. What would you like Alex to know?" },
    { speaker: 'Caller', text: 'Please ask Alex to call back about the afternoon delivery.' },
  ],
}];
