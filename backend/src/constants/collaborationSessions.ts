export interface SessionDefinition {
  sessionNumber: number;
  title: string;
  description: string;
}

export const COLLABORATION_SESSIONS: SessionDefinition[] = [
  { sessionNumber: 1, title: 'Introduction & Role Overview', description: 'Meet each other and walk through what the new joinee’s role covers day to day.' },
  { sessionNumber: 2, title: 'Key Tools & Systems Walkthrough', description: 'Hands-on tour of the systems and tools the new joinee will use most.' },
  { sessionNumber: 3, title: 'LOB Processes & Workflows', description: 'Walk through the core workflows and processes specific to this line of business.' },
  { sessionNumber: 4, title: 'Compliance & Regulatory Overview', description: 'Review the compliance obligations and regulatory context that apply to the role.' },
  { sessionNumber: 5, title: 'Networking & Key Contacts', description: 'Introduce the new joinee to key contacts and go-to people across the team.' },
  { sessionNumber: 6, title: '30-Day Check-In & Goals Review', description: 'Check in on progress so far and set goals for the next stretch.' },
];

export const SESSION_CADENCE_DAYS = 7;
