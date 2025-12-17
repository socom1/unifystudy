import { ref, onValue, off } from 'firebase/database';
import { db } from './firebaseConfig';

/**
 * Subscribes to the users data for the leaderboard.
 * @param {function} callback - Function to call with the data when it updates.
 * @returns {function} - Unsubscribe function.
 */
export const subscribeToLeaderboard = (callback) => {
  const usersRef = ref(db, 'public_leaderboard');
  
  const listener = onValue(usersRef, (snap) => {
    const data = snap.val();
    callback(data);
  }, (error) => {
    console.error("Error fetching leaderboard data:", error);
    callback(null);
  });

  return () => off(usersRef, listener);
};
