export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  settings?: {
    customization?: {
      theme?: string;
    };
  };
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  day: string;
  start: number;
  end: number;
  color: string;
  type?: 'Lecture' | 'Workshop' | 'Study' | 'Other';
}
