import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, userType, email, name, businessName } = req.body;
    if (!userId || !userType || !email) {
      return res.status(400).json({ error: 'Missing required fields: userId, userType, email' });
    }

    const accountParams = {
      type: 'express',
      email,
      capabilities: { transfers: { requested: true } },
      business_type: userType === 'manager' ? 'company' : 'individual',
      metadata: { turnready_user_id: userId, user_type: userType },
    };
    if (name || businessName) {
      accountParams.business_profile = {
        name: businessName || name,
        url: 'https://app.turnready.app',
        mcc: '7349',
      };
    }

    const account = await stripe.accounts.create(accountParams);
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://app.turnready.app/?stripe=refresh&account=${account.id}&user=${userId}`,
      return_url:  `https://app.turnready.app/?stripe=success&account=${account.id}&user=${userId}`,
      type: 'account_onboarding',
    });

    return res.status(200).json({ accountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('create-connect-account error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
