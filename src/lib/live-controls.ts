// Product descriptions only. No provider capabilities or executable commands.
export const liveControls = [
  { name: 'Insider', subtitle: 'Listen live', description: 'Listen silently to the agent and caller on an authorized live call.', requirement: 'Requires verified listen-only audio and permission for the line.' },
  { name: 'Gavel', subtitle: 'Take over', description: 'Take the call yourself while the agent is stopped and removed.', requirement: 'Requires a tested human connection and confirmed AI removal.' },
  { name: 'Audible', subtitle: 'Guide agent', description: 'Send private text direction to the active AI agent during a call.', requirement: 'Requires a verified private channel to the current agent session.' },
  { name: 'Directory', subtitle: 'Transfer', description: 'Transfer to approved numbers, extensions, people and supported destinations.', requirement: 'Each destination type requires its own routing and acceptance tests.' },
] as const;
