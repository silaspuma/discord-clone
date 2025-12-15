import { NextApiRequest } from "next";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db as firestore } from "@/lib/firebase";

import { NextApiResponseServerIo } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl } = req.body;
    const { serverId, channelId } = req.query;

    if (!profile) return res.status(401).json({ error: "Unauthorized" });

    if (!serverId)
      return res.status(400).json({ error: "Server ID Missing" });

    if (!channelId)
      return res.status(400).json({ error: "Channel ID Missing" });

    if (!content)
      return res.status(400).json({ error: "Content Missing" });

    // Check if server exists and user is a member
    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
      },
    });

    if (!server)
      return res.status(404).json({ message: "Server not found" });

    // Get all members of the server
    const membersQuery = query(
      collection(firestore, "members"),
      where("serverId", "==", serverId as string)
    );
    const membersSnapshot = await getDocs(membersQuery);
    const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const member = members.find((m: any) => m.profileId === profile.id);

    if (!member)
      return res.status(404).json({ message: "Member not found" });

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string
      }
    });

    if (!channel)
      return res.status(404).json({ message: "Channel not found" });

    // Create message - Firestore real-time listeners will handle updates
    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId: channelId as string,
        memberId: member.id
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });

    return res.status(200).json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
