import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import { db } from "@/lib/db";

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

    const profile = await db.profile.findUnique({
      where: { userId }
    });

    return profile;
  } catch (error) {
    console.error("Error getting current profile:", error);
    return null;
  }
};
