import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);

    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const serverId = searchParams.get("serverId");
    if (!serverId)
      return new NextResponse("Server ID Missing", { status: 400 });

    if (!params.memberId)
      return new NextResponse("Member ID Missing", { status: 400 });

    // Verify the server belongs to the profile
    const server = await db.server.findFirst({
      where: { id: serverId }
    });
    
    if (!server || server.profileId !== profile.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get the member to verify it's not the server owner
    const member = await db.member.findFirst({
      where: { id: params.memberId }
    });
    
    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }
    
    if (member.profileId === profile.id) {
      return new NextResponse("Cannot kick yourself", { status: 400 });
    }

    // Delete the member
    await db.member.delete({
      where: { id: params.memberId }
    });
    
    // Return the server (without members to keep it simple for now)
    return NextResponse.json(server);
  } catch (error) {
    console.error("[MEMBER_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const { role } = await req.json();

    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const serverId = searchParams.get("serverId");
    if (!serverId)
      return new NextResponse("Server ID Missing", { status: 400 });

    if (!params.memberId)
      return new NextResponse("Member ID Missing", { status: 400 });

    // Verify the server belongs to the profile
    const server = await db.server.findFirst({
      where: { id: serverId }
    });
    
    if (!server || server.profileId !== profile.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get the member to verify it's not the server owner
    const member = await db.member.findFirst({
      where: { id: params.memberId }
    });
    
    if (!member) {
      return new NextResponse("Member not found", { status: 404 });
    }
    
    if (member.profileId === profile.id) {
      return new NextResponse("Cannot change your own role", { status: 400 });
    }

    // Update the member's role
    await db.member.update({
      where: { id: params.memberId },
      data: { role }
    });
    
    // Return the server (without members to keep it simple for now)
    return NextResponse.json(server);
  } catch (error) {
    console.error("[MEMBER_ID_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
