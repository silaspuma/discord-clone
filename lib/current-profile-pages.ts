import { NextApiRequest } from "next";
import { adminAuth } from "./firebase-admin";
import { db } from "@/lib/db";

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

    const profile = await db.profile.findUnique({ userId });

    return profile;
  } catch (error) {
    console.error("Error getting current profile (pages):", error);
    return null;
  }
};
