import { prisma } from "@/src/lib/prisma";
import { withParams } from "@/src/lib/route-handler";
import { supabase } from "@/src/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const POST = withParams(async (request, segment) => {
  const bookmarkId = segment.params?.bookmarkid;

  if (!bookmarkId) {
    return NextResponse.json(
      { error: "Bookmark ID required" },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify bookmark belongs to user
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark || bookmark.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 },
    );
  }
});
