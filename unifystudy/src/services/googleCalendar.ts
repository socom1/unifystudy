import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly";

export const connectGoogleCalendar = async () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
  provider.addScope("https://www.googleapis.com/auth/tasks.readonly");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    // For implicit flow often the accessToken is enough for API calls if we just want to read.
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      throw new Error("No access token provided");
    }

    return accessToken;
  } catch (error) {
    console.error("Error connecting to Google:", error);
    throw error;
  }
};

export const fetchUpcomingEvents = async (accessToken: string) => {
  try {
    const now = new Date().toISOString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${nextWeek.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const fetchGoogleTasks = async (accessToken: string) => {
    try {
        // 1. Get Task Lists
        const listsResponse = await fetch(
            'https://tasks.googleapis.com/tasks/v1/users/@me/lists', 
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listsResponse.ok) throw new Error("Failed to fetch task lists");
        
        const listsData = await listsResponse.json();
        const lists = listsData.items || [];
        
        // 2. Get Tasks from Default List (usually the first one or @default)
        // Let's fetch from the first found list to be simple, usually "My Tasks"
        if (lists.length === 0) return [];

        const defaultListId = lists[0].id; // Or strict '@default'
        
        const tasksResponse = await fetch(
            `https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks?showCompleted=false&maxResults=20`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!tasksResponse.ok) throw new Error("Failed to fetch tasks");
        
        const tasksData = await tasksResponse.json();
        return tasksData.items || [];

    } catch (error) {
        console.error("Error fetching Google Tasks:", error);
        throw error;
    }
};
