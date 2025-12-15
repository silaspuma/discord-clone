import { NextResponse } from "next/server";
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc } from "firebase/firestore";
import { db as firestore } from "@/lib/firebase";

import { currentProfile } from "@/lib/current-profile";

const MESSAGES_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const conversationId = searchParams.get("conversationId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!conversationId)
      return new NextResponse("Conversation ID Missing", { status: 400 });

    let messages: any[] = [];
    let q;

    if (cursor) {
      // Get cursor document for pagination
      const cursorDoc = await getDoc(doc(firestore, "directMessages", cursor));
      
      q = query(
        collection(firestore, "directMessages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        startAfter(cursorDoc),
        limit(MESSAGES_BATCH)
      );
    } else {
      q = query(
        collection(firestore, "directMessages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        limit(MESSAGES_BATCH)
      );
    }

    const querySnapshot = await getDocs(q);

    // Fetch messages with member and profile data
    for (const messageDoc of querySnapshot.docs) {
      const messageData: any = {
        id: messageDoc.id,
        ...messageDoc.data(),
      };

      // Convert timestamps
      if (messageData.createdAt?.toDate) {
        messageData.createdAt = messageData.createdAt.toDate();
      }
      if (messageData.updatedAt?.toDate) {
        messageData.updatedAt = messageData.updatedAt.toDate();
      }

      // Fetch member data
      if (messageData.memberId) {
        const memberDoc = await getDoc(doc(firestore, "members", messageData.memberId));
        if (memberDoc.exists()) {
          messageData.member = {
            id: memberDoc.id,
            ...memberDoc.data(),
          };

          // Fetch profile data
          if (messageData.member.profileId) {
            const profileDoc = await getDoc(doc(firestore, "profiles", messageData.member.profileId));
            if (profileDoc.exists()) {
              messageData.member.profile = {
                id: profileDoc.id,
                ...profileDoc.data(),
              };
            }
          }
        }
      }

      messages.push(messageData);
    }

    let nextCursor = null;

    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    return NextResponse.json({ items: messages, nextCursor });
  } catch (error) {
    console.error("[DIRECT_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
