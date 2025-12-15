import { NextResponse } from "next/server";
import { MemberRole } from "@/lib/firestore-helpers";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!serverId)
      return new NextResponse("Server ID is Missing", { status: 400 });

    if (name === "general")
      return new NextResponse("Name cannot be 'general'", { status: 400 });

    // Check if user is admin or moderator
    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
    });

    if (!member || ![MemberRole.ADMIN, MemberRole.MODERATOR].includes(member.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Create the channel
    const channel = await db.channel.create({
      data: {
        profileId: profile.id,
        name,
        type,
        serverId,
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[CHANNELS_POST", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
