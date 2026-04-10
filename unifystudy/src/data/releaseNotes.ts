export interface ReleaseNote {
  version: string;
  title: string;
  description: string;
  features: string[];
  date: string;
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.0.1',
    title: 'UnifyStudy 1.0.1 - The Production Polish Update',
    description: 'A comprehensive refinement patch introducing deep analytics, robust security, SEO integration, and a significantly improved startup experience.',
    features: [
      '🚀 Lightning Startup: Sleek new animated Splash Screen replaces the empty loader.',
      '📊 Telemetry: Integrated Firebase Analytics to understand user behaviors.',
      '🌐 SEO Amplified: OpenGraph rendering added—sharing links now generates beautiful preview cards.',
      '🔐 Fully Hardened: Strong XSS input sanitization across all task boards and chats.',
      '♿ ARIA Enabled: Keyboard traversal properly supported across custom elements.'
    ],
    date: new Date().toISOString().split('T')[0]
  },
  {
    version: '1.0.0',
    title: 'UnifyStudy 1.0.0 - Official Launch',
    description: 'Welcome to the official 1.0.0 release! UnifyStudy has been hardened, polished, and is now fully ready for production.',
    features: [
      '🚀 Live Production: Complete stabilization of the core application.',
      '🔒 Privacy Controls: Full GDPR compliance with Data Export and Account Deletion features.',
      '🔔 Push Notifications: Pomodoro and events now trigger desktop alerts.',
      '📱 PWA Installable: You can now install UnifyStudy directly to your device.',
      '🛡️ Error Resilience: Deep error boundaries prevent white-screen crashes.'
    ],
    date: new Date().toISOString().split('T')[0]
  }
];

export const getLatestReleaseNote = (): ReleaseNote => {
  return releaseNotes[0];
};

export const getVersion = (): string => {
    return releaseNotes[0].version;
}
