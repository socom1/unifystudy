export interface ReleaseNote {
  version: string;
  title: string;
  description: string;
  features: string[];
  date: string;
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.0.0',
    title: 'UnifyStudy 1.0 - Official Release',
    description: 'We\'ve added smart navigation, refined the timetable, and fixed key interactions for a seamless experience.',
    features: [
      '⚡ Urgent Tasks: Click to navigate directly to the task',
      '📅 Timetable: Cleaner UI with theme-aware colors',
      '💬 Chat: Sidebar now updates instantly for new DMs',
      '🎨 Visuals: Removing clutter and improving spacing',
      '🚀 Performance: Optimized state management'
    ],
    date: '2026-01-05'
  }
];

export const getLatestReleaseNote = (): ReleaseNote => {
  return releaseNotes[0];
};

export const getVersion = (): string => {
    return releaseNotes[0].version;
}
