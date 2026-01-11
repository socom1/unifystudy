import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export const connectGoogleCalendar = async () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(SCOPES);

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      throw new Error("No access token provided");
    }

    return accessToken;
  } catch (error) {
    console.error("Error connecting to Google Calendar:", error);
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
