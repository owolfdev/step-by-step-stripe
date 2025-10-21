// src/app/api/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClientWithCookies } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createServerClientWithCookies();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read customer's stripe_customer_id
    const { data: profile, error } = await supabase
      .from("stripe_step_by_step_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for user" },
        { status: 400 }
      );
    }

    const returnUrl =
      process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/billing`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    console.error("[/api/portal] error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
