import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import { firestoreDb } from "./firestore-helpers";

export const currentProfile = async () => {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return null;
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedClaims.uid;

    if (!userId) return null;

    const profile = await firestoreDb.profile.findUnique({ userId });

    return profile;
  } catch (error) {
    console.error("Error getting current profile:", error);
    return null;
  }
};
