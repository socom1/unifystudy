import { OAuthProvider, signInWithPopup, getAuth } from "firebase/auth";

const SCOPES = [
  "Calendars.Read",
  "Tasks.Read"
];

const provider = new OAuthProvider('microsoft.com');
provider.addScope('Calendars.Read');
provider.addScope('Tasks.Read');
provider.setCustomParameters({
  // Force consent prompt to ensure we get a refresh token if needed, 
  // though for client-side implicit flow usually just access token is enough for session.
  prompt: "select_account" 
});

export const connectMicrosoft = async () => {
  const auth = getAuth();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = OAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error("No access token provided");
    }

    return accessToken;
  } catch (error) {
    console.error("Error connecting to Microsoft:", error);
    throw error;
  }
};

export const fetchOutlookEvents = async (accessToken: string) => {
  try {
    // Get events for the next 7 days
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const startDateTime = now.toISOString();
    const endDateTime = nextWeek.toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=50&$orderby=start/dateTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"' 
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Outlook events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("Error fetching Outlook events:", error);
    throw error;
  }
};

export const fetchMicrosoftToDo = async (accessToken: string) => {
  try {
    // 1. Get default task list (or all lists)
    // For simplicity, let's just get the default tasks from the default list
    // Only available if we knew the list ID. Let's list lists first if needed, 
    // or use the well-known folder 'tasks' if legacy API, but Graph uses /me/todo/lists
    
    // Fetch all lists first
    const listsResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!listsResponse.ok) throw new Error("Failed to fetch To Do lists");
    
    const listsData = await listsResponse.json();
    const lists = listsData.value || [];

    let allTasks: any[] = [];

    // Fetch tasks from each list (limit to 5 lists to be safe on rate limits/perf)
    for (const list of lists.slice(0, 5)) {
        const tasksResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'&$top=20`, 
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            const tasks = tasksData.value || [];
            // Tag them with list name for UI context
            const taggedTasks = tasks.map((t: any) => ({ ...t, listName: list.displayName }));
            allTasks = [...allTasks, ...taggedTasks];
        }
    }

    return allTasks;

  } catch (error) {
    console.error("Error fetching Microsoft To Do:", error);
    throw error;
  }
};
