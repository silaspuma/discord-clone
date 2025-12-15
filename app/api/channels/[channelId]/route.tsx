import { NextResponse } from "next/server";
import { MemberRole } from "@/lib/firestore-helpers";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    if (!serverId)
      return new NextResponse("Server ID Missing", { status: 400 });
    if (!params.channelId)
      return new NextResponse("Channel ID Missing", { status: 400 });

    const { name, type } = await req.json();
    if (!name || !type || name === "general")
      return new NextResponse("Name / Type cannot be empty or general", {
        status: 400
      });

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

    // Get current channel
    const channel = await db.channel.findFirst({
      where: { id: params.channelId },
    });

    if (!channel || channel.name === "general") {
      return new NextResponse("Cannot edit general channel", { status: 400 });
    }

    // Update the channel
    const updatedChannel = await db.channel.update({
      where: { id: params.channelId },
      data: { name, type },
    });

    return NextResponse.json(updatedChannel);
  } catch (error) {
    console.error("[CHANNEL_ID_PATCH", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    if (!serverId)
      return new NextResponse("Server ID Missing", { status: 400 });
    if (!params.channelId)
      return new NextResponse("Channel ID Missing", { status: 400 });

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

    // Get current channel
    const channel = await db.channel.findFirst({
      where: { id: params.channelId },
    });

    if (!channel || channel.name === "general") {
      return new NextResponse("Cannot delete general channel", { status: 400 });
    }

    // Delete the channel
    await db.channel.delete({
      where: { id: params.channelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHANNEL_ID_DELETE", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
