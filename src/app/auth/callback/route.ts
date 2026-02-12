import { withParams } from "@/src/lib/route-handler";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const GET = withParams(async (request, _) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page
  return NextResponse.redirect(new URL("/", requestUrl.origin));
});
