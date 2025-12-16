import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!params.serverId)
      return new NextResponse("Server ID Missing", { status: 400 });

    // Check if the user is not the owner and is a member
    const server = await db.server.findFirst({
      where: { id: params.serverId }
    });
    
    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }
    
    if (server.profileId === profile.id) {
      return new NextResponse("Cannot leave your own server", { status: 400 });
    }
    
    const member = await db.member.findFirst({
      where: { 
        serverId: params.serverId,
        profileId: profile.id
      }
    });
    
    if (!member) {
      return new NextResponse("Not a member of this server", { status: 400 });
    }
    
    // Delete the member
    await db.member.delete({
      where: { id: member.id }
    });
    
    // Return the updated server
    const updatedServer = await db.server.findFirst({
      where: { id: params.serverId }
    });

    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error("[SERVER_ID_LEAVE_PATCH]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
