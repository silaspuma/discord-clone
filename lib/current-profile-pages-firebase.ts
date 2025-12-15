import { NextApiRequest } from "next";
import { adminAuth } from "./firebase-admin";
import { firestoreDb } from "./firestore-helpers";

export const currentProfilePages = async (req: NextApiRequest) => {
  try {
    const sessionCookie = req.cookies.session;
    
    if (!sessionCookie) {
      return null;
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedClaims.uid;

    if (!userId) return null;

    const profile = await firestoreDb.profile.findUnique({
      where: { userId }
    });

    return profile;
  } catch (error) {
    console.error("Error getting current profile (pages):", error);
    return null;
  }
};
