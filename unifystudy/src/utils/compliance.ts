import { auth, db } from "@/services/firebaseConfig";
import { ref, get, set } from "firebase/database";
import { deleteUser } from "firebase/auth";

/**
 * Gathers all user data from Firebase and prompts a download.
 */
export const exportUserData = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    // We fetch users/$uid and public_leaderboard/$uid
    const userRef = ref(db, `users/${user.uid}`);
    const pubRef = ref(db, `public_leaderboard/${user.uid}`);

    try {
        const [userSnap, pubSnap] = await Promise.all([
            get(userRef),
            get(pubRef)
        ]);

        const exportData = {
            exportDate: new Date().toISOString(),
            uid: user.uid,
            email: user.email,
            userData: userSnap.val() || {},
            publicProfile: pubSnap.val() || {}
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `unifystudy_export_${user.uid}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        return true;
    } catch (err) {
        console.error("Export failed:", err);
        throw new Error("Failed to export data");
    }
}

/**
 * Wipes DB records then deletes the Firebase Auth user.
 * Note: Re-authentication might be required if their session is old.
 */
export const deleteUserAccount = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    try {
        // 1. Wipe database entries
        await set(ref(db, `users/${user.uid}`), null);
        await set(ref(db, `public_leaderboard/${user.uid}`), null);
        
        // 2. Delete auth user
        await deleteUser(user);
        
        return true;
    } catch (err: any) {
        console.error("Deletion failed:", err);
        // Error code auth/requires-recent-login requires them to log in again
        if (err.code === 'auth/requires-recent-login') {
            throw new Error("For security, you must log out and log back in before deleting your account.");
        }
        throw new Error(err.message || "Failed to delete account");
    }
}
