// Achievements System
// Defines all available achievements, their criteria, and rewards

export const ACHIEVEMENTS = [
  // Study Time Achievements
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first study session",
    category: "study-time",
    reward: 100,
    criteria: {
      type: "sessions",
      target: 1
    }
  },
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Study for 1 hour total",
    category: "study-time",
    reward: 150,
    criteria: {
      type: "totalMinutes",
      target: 60
    }
  },
  {
    id: "dedicated-learner",
    name: "Dedicated Learner",
    description: "Study for 10 hours total",
    category: "study-time",
    reward: 300,
    criteria: {
      type: "totalMinutes",
      target: 600
    }
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Study for 50 hours total",
    category: "study-time",
    reward: 500,
    criteria: {
      type: "totalMinutes",
      target: 3000
    }
  },
  {
    id: "master-student",
    name: "Master Student",
    description: "Study for 100 hours total",
    category: "study-time",
    reward: 1000,
    criteria: {
      type: "totalMinutes",
      target: 6000
    }
  },

  // Streak Achievements
  {
    id: "on-fire",
    name: "On Fire",
    description: "Maintain a 3 day study streak",
    category: "streak",
    reward: 200,
    criteria: {
      type: "streak",
      target: 3
    }
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Maintain a 7 day study streak",
    category: "streak",
    reward: 400,
    criteria: {
      type: "streak",
      target: 7
    }
  },
  {
    id: "diamond-streak",
    name: "Diamond Streak",
    description: "Maintain a 30 day study streak",
    category: "streak",
    reward: 1500,
    criteria: {
      type: "streak",
      target: 30
    }
  },

  // Session Achievements
  {
    id: "focused",
    name: "Focused",
    description: "Complete 10 study sessions",
    category: "sessions",
    reward: 250,
    criteria: {
      type: "sessions",
      target: 10
    }
  },
  {
    id: "iron-will",
    name: "Iron Will",
    description: "Complete 50 study sessions",
    category: "sessions",
    reward: 600,
    criteria: {
      type: "sessions",
      target: 50
    }
  },
  {
    id: "legendary",
    name: "Legendary",
    description: "Complete 100 study sessions",
    category: "sessions",
    reward: 1200,
    criteria: {
      type: "sessions",
      target: 100
    }
  }
];

// Check which achievements a user has unlocked based on their stats
export function checkAchievements(userStats, currentStreak) {
  const totalMinutes = userStats?.totalStudyTime || 0;
  const sessionCount = userStats?.sessionCount || 0;
  
  const newlyUnlocked = [];
  const progress = {};

  ACHIEVEMENTS.forEach(achievement => {
    let current = 0;
    let isUnlocked = false;

    switch (achievement.criteria.type) {
      case "totalMinutes":
        current = totalMinutes;
        isUnlocked = current >= achievement.criteria.target;
        break;
      case "sessions":
        current = sessionCount;
        isUnlocked = current >= achievement.criteria.target;
        break;
      case "streak":
        current = currentStreak;
        isUnlocked = current >= achievement.criteria.target;
        break;
    }

    if (isUnlocked) {
      newlyUnlocked.push(achievement.id);
    } else {
      progress[achievement.id] = {
        current,
        target: achievement.criteria.target,
        percentage: Math.min(100, (current / achievement.criteria.target) * 100)
      };
    }
  });

  return { newlyUnlocked, progress };
}

// Get achievement by ID
export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}
