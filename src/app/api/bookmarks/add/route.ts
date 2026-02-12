import { prisma } from "@/src/lib/prisma";
import { withParams } from "@/src/lib/route-handler";
import { supabase } from "@/src/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
});

export const POST = withParams(async (request, segment) => {
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

    const body = await request.json();
    const { url, title } = schema.parse(body);

    // Create user if doesn't exist
    await prisma.user.upsert({
      where: { email: user.email! },
      update: {},
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata.full_name,
        image: user.user_metadata.avatar_url,
      },
    });

    const bookmark = await prisma.bookmark.create({
      data: {
        url,
        title,
        userId: user.id,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error }, { status: 400 });
    }
    console.error("Error creating bookmark:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 },
    );
  }
});
