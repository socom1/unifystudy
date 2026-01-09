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
    title: 'UnifyStudy 1.0.1 - Patch Notes',
    description: 'A major polish update focusing on mobile responsiveness, layout consistency, and app stability.',
    features: [
      '� Mobile Experience: Fixed header overlaps in Analytics, Shop, Leaderboard, and Habits',
      '🎓 Grades Update: New master-detail navigation for easier mobile access',
      '🔧 Layout Fixes: Fixed scrolling in Settings and centered the Pomodoro timer',
      '🐛 Bug Fixes: Resolved critical startup crashes and Chat layout glitches'
    ],
    date: '2026-01-09'
  },
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
