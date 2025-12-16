import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "./firebase-admin";
import { db } from "@/lib/db";

export const initialProfile = async () => {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return redirect("/sign-in");
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedClaims.uid;
    
    if (!userId) return redirect("/sign-in");

    // Get user data from Firebase Auth
    const user = await adminAuth.getUser(userId);

    const profile = await db.profile.findUnique({ userId: user.uid });

    if (profile) return profile;

    const name = user.displayName || user.email?.split("@")[0] || user.uid;

    const newProfile = await db.profile.create({
      data: {
        userId: user.uid,
        name,
        imageUrl: user.photoURL || "",
        email: user.email || ""
      }
    });

    return newProfile;
  } catch (error) {
    console.error("Error getting initial profile:", error);
    return redirect("/sign-in");
  }
};
