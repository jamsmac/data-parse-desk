import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received event:", event.type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;

      if (!customerEmail) {
        console.error("No customer email in session");
        return new Response(JSON.stringify({ error: "No customer email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) {
        console.error("Error fetching users:", userError);
        throw userError;
      }

      const user = userData.users.find((u) => u.email === customerEmail);
      if (!user) {
        console.error("User not found for email:", customerEmail);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine credit package based on amount
      const amountTotal = session.amount_total || 0;
      let creditsToAdd = 0;
      let packageName = "";

      if (amountTotal === 500) {
        creditsToAdd = 50;
        packageName = "Starter (50 кредитов)";
      } else if (amountTotal === 2000) {
        creditsToAdd = 250;
        packageName = "Professional (250 кредитов)";
      } else if (amountTotal === 5000) {
        creditsToAdd = 750;
        packageName = "Enterprise (750 кредитов)";
      } else {
        console.error("Unknown package amount:", amountTotal);
        creditsToAdd = amountTotal / 10; // fallback: 10 cents = 1 credit
        packageName = `Custom (${creditsToAdd} кредитов)`;
      }

      // Get current user credits
      const { data: currentCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (creditsError && creditsError.code !== "PGRST116") {
        console.error("Error fetching credits:", creditsError);
        throw creditsError;
      }

      const currentPaidCredits = currentCredits?.paid_credits || 0;
      const currentFreeCredits = currentCredits?.free_credits || 0;
      const newPaidCredits = currentPaidCredits + creditsToAdd;
      const balanceAfter = newPaidCredits + currentFreeCredits;

      // Update user credits
      const { error: updateError } = await supabase
        .from("user_credits")
        .upsert({
          user_id: user.id,
          paid_credits: newPaidCredits,
          free_credits: currentFreeCredits,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error("Error updating credits:", updateError);
        throw updateError;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user.id,
          amount: creditsToAdd,
          transaction_type: "purchase",
          description: `Покупка пакета: ${packageName}`,
          stripe_payment_id: session.payment_intent as string,
          balance_after: balanceAfter,
          operation_type: "credit",
        });

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
        throw transactionError;
      }

      console.log(`Successfully credited ${creditsToAdd} credits to user ${user.id}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
