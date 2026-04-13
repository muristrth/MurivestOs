import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix";

const CLERK_WEBHOOK_SECRET = Deno.env.get("CLERK_WEBHOOK_SECRET")!;

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{ email_address: string }>;
  phone_numbers: Array<{ phone_number: string }>;
  primary_email_address_id: string | null;
  image_url: string | null;
}

serve(async (req) => {
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let evt: { type: string; data: ClerkUser };
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: ClerkUser };
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const user = evt.data;

    const primaryEmail = user.email_addresses?.[0]?.email_address ?? "";
    const phone = user.phone_numbers?.[0]?.phone_number ?? null;
    const firstName = user.first_name ?? null;
    const lastName = user.last_name ?? null;
    const avatarUrl = user.image_url ?? null;

    const { error } = await supabase.from("app_users").upsert(
      {
        clerk_user_id: user.id,
        email: primaryEmail,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl,
        phone: phone,
        role_slug: "internal_team",
        is_approved: false,
        is_active: true,
        can_login: true,
      },
      {
        onConflict: "clerk_user_id",
      },
    );

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify(error), { status: 500 });
    }
  }

  if (evt.type === "user.deleted") {
    const user = evt.data;

    const { error } = await supabase
      .from("app_users")
      .update({
        is_active: false,
        can_login: false,
      })
      .eq("clerk_user_id", user.id);

    if (error) {
      console.error("Deactivate error:", error);
      return new Response(JSON.stringify(error), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ message: "Processed" }), {
    status: 200,
  });
});
