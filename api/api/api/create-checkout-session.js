import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  solo: process.env.VITE_STRIPE_SOLO_PRICE,
  pro: process.env.VITE_STRIPE_PRO_PRICE,
  agency: process.env.VITE_STRIPE_AGENCY_PRICE,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { managerId, managerEmail, managerName, businessName, plan, stripeCustomerId } = req.body;
    if (!managerId || !managerEmail || !plan) {
      return res.status(400).json({ error: 'Missing required fields: managerId, managerEmail, plan' });
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return res.status(500).json({ error: `Price ID for plan "${plan}" not configured in Vercel environment variables.` });
    }

    let customerId = stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: managerEmail,
        name: businessName || managerName,
        metadata: { turnready_user_id: managerId, plan },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `https://app.turnready.app/?stripe=subscribed&plan=${plan}&customer=${customerId}&manager=${managerId}`,
      cancel_url: `https://app.turnready.app/?stripe=cancelled`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { turnready_user_id: managerId, plan } },
      metadata: { turnready_user_id: managerId, plan },
    });

    return res.status(200).json({ checkoutUrl: session.url, sessionId: session.id, customerId });
  } catch (err) {
    console.error('create-checkout-session error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
