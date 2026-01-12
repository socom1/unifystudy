export interface ReleaseNote {
  version: string;
  title: string;
  description: string;
  features: string[];
  date: string;
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.0.6',
    title: 'UnifyStudy 1.0.6 - UI Polish & Confirmation Modals',
    description: 'A refinement update with nicer delete confirmations, improved To-Do styling, and README screenshots.',
    features: [
      '🗑️ Delete Modals: Beautiful confirmation popups replace native alerts',
      '📝 To-Do Styling: Tags now appear as readable pills, Details panel polished',
      '📸 README: Added screenshots for Dashboard, Timetable, Calendar & To-Do',
      '🐛 Fixes: Removed lingering mock data from Calendar view'
    ],
    date: '2026-01-12'
  },
  {
    version: '1.0.5',
    title: 'UnifyStudy 1.0.5 - Chat Stability & Light Mode',
    description: 'A major stability update for Chat, eliminating all visual jitters and shaking, plus comprehensive theme fixes.',
    features: [
      '💬 Chat Stability: Fixed "twitching" while typing (Optimized Rendering)',
      '🛹 Smooth Scroll: Eliminated stutter and shake when scrolling to bottom',
      '☀️ Light Mode: Fixed hardcoded dark backgrounds in Timetable, Settings & Profile'
    ],
    date: '2026-01-12'
  },
  {
    version: '1.0.4',
    title: 'UnifyStudy 1.0.4 - Audio & Visual Polish',
    description: 'Refined UI logic for university verification, restored Focus Mode ambience, and brightened the Timetable.',
    features: [
      '🎓 Verification: "Verify" button & headers now hide after joining a university',
      '🧘 Focus Mode: Restored Rain/Wind ambience with reliable audio sources',
      '📅 Timetable: Refreshed styling to use the global Glass theme (brighter look)',
      '🎵 Fixes: Improved audio playback reliability in Focus Mode'
    ],
    date: '2026-01-11'
  },
  {
    version: '1.0.3',
    title: 'UnifyStudy 1.0.3 - Layout & Feature Updates',
    description: 'General improvements to application layout and feature availability.',
    features: [
      '✨ UI Improvements: Enhanced layout stability and corrected visual spacing',
      '🤖 Assistant Update: Nova Assistant is temporarily unavailable for upgrades',
      '📱 Mobile Polish: Better responsiveness across various devices',
      '🔧 Maintenance: Removed legacy features for better performance'
    ],
    date: '2026-01-11'
  },
  {
    version: '1.0.2',
    title: 'UnifyStudy 1.0.2 - Visual Polish Update',
    description: 'Refining the visual experience with themed components, improved responsiveness, and better chat interactions.',
    features: [
      '🎨 Theming: Loading screens and popups now perfectly match your selected theme',
      '🧘 Zen Mode: Fixed layout responsiveness for smaller windows',
      '👥 Chat UI: Bigger, cleaner User Picker for easier connections',
      '🐛 Polish: Consistent spinners and version display updates'
    ],
    date: '2026-01-10'
  },
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
