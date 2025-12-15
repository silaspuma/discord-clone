import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const uploadType = formData.get("uploadType") as string;
    const entityId = formData.get("entityId") as string;

    if (!file) {
      return new NextResponse("File is required", { status: 400 });
    }

    if (!uploadType || !entityId) {
      return new NextResponse("Upload type and entity ID are required", {
        status: 400,
      });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine upload path based on type
    let path = "";
    if (uploadType === "server") {
      path = `servers/${entityId}/${Date.now()}_${file.name}`;
    } else if (uploadType === "message") {
      path = `messages/${entityId}/${Date.now()}_${file.name}`;
    } else if (uploadType === "direct-message") {
      path = `direct-messages/${entityId}/${Date.now()}_${file.name}`;
    } else {
      return new NextResponse("Invalid upload type", { status: 400 });
    }

    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: profile.userId,
          uploadType,
          entityId,
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("[UPLOAD_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
