import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


serve(async (req) => {
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const { package_id } = await req.json();
    
    const packages: Record<string, { credits: number; price: number }> = {
      'small': { credits: 100, price: 1000 }, // $10.00
      'medium': { credits: 500, price: 4000 }, // $40.00
      'large': { credits: 1000, price: 7000 }, // $70.00
    };

    const selectedPackage = packages[package_id];
    if (!selectedPackage) {
      throw new Error('Invalid package selected');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${selectedPackage.credits} Credits`,
              description: `AI Credits Package`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/settings?payment=success&credits=${selectedPackage.credits}`,
      cancel_url: `${req.headers.get('origin')}/settings?payment=canceled`,
      metadata: {
        user_id: user.id,
        credits: selectedPackage.credits.toString(),
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
