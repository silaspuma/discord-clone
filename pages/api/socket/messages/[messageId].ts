import { NextApiRequest } from "next";
import { MemberRole } from "@/lib/firestore-helpers";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db as firestore } from "@/lib/firebase";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "DELETE" && req.method !== "PATCH")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const profile = await currentProfilePages(req);
    const { content } = req.body;
    const { serverId, channelId, messageId } = req.query;

    if (!profile) return res.status(401).json({ error: "Unauthorized" });

    if (!serverId)
      return res.status(400).json({ error: "Server ID Missing" });

    if (!channelId)
      return res.status(400).json({ error: "Channel ID Missing" });

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
      },
    });

    if (!server)
      return res.status(404).json({ error: "Server not found" });

    // Get all members of the server
    const membersQuery = query(
      collection(firestore, "members"),
      where("serverId", "==", serverId as string)
    );
    const membersSnapshot = await getDocs(membersQuery);
    const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const member = members.find((m: any) => m.profileId === profile.id);

    if (!member)
      return res.status(404).json({ error: "Member not found" });

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string
      }
    });

    if (!channel)
      return res.status(404).json({ error: "Channel not found" });

    // Get message with details
    const messageDoc = await getDoc(doc(firestore, "messages", messageId as string));
    
    if (!messageDoc.exists())
      return res.status(404).json({ error: "Message not found" });

    const messageData: any = { id: messageDoc.id, ...messageDoc.data() };

    if (messageData.deleted)
      return res.status(404).json({ error: "Message not found" });

    const isMessageOwner = messageData.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) return res.status(401).json({ error: "Unauthorized" });

    let message;

    if (req.method === "DELETE") {
      message = await db.message.update({
        where: {
          id: messageId as string
        },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true
        },
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });
    }

    if (req.method === "PATCH") {
      if (!isMessageOwner)
        return res.status(401).json({ error: "Unauthorized" });

      message = await db.message.update({
        where: {
          id: messageId as string
        },
        data: {
          content
        },
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });
    }

    // Firestore real-time listeners will handle updates automatically
    return res.status(200).json(message);
  } catch (error) {
    console.error("[MESSAGES_ID]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
