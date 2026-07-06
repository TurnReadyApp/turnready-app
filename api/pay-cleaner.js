import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cleanerStripeAccountId, amountCents, jobId, propertyName, managerId } = req.body;
    if (!cleanerStripeAccountId || !amountCents || !jobId) {
      return res.status(400).json({ error: 'Missing required fields: cleanerStripeAccountId, amountCents, jobId' });
    }

    const account = await stripe.accounts.retrieve(cleanerStripeAccountId);
    if (!account || account.capabilities?.transfers !== 'active') {
      return res.status(400).json({
        error: 'Cleaner Stripe account is not ready. They need to complete Stripe onboarding first.',
        accountStatus: account?.capabilities?.transfers || 'unknown',
      });
    }

    const transfer = await stripe.transfers.create({
      amount:      amountCents,
      currency:    'usd',
      destination: cleanerStripeAccountId,
      description: `TurnReady payout — ${propertyName || 'cleaning job'}`,
      metadata:    { job_id: jobId, manager_id: managerId || '', property_name: propertyName || '' },
      transfer_group: `job_${jobId}`,
    });

    return res.status(200).json({
      success:    true,
      transferId: transfer.id,
      amount:     transfer.amount,
      currency:   transfer.currency,
    });
  } catch (err) {
    console.error('pay-cleaner error:', err.message);
    let msg = err.message;
    if (err.code === 'insufficient_funds') msg = 'Insufficient funds in your Stripe balance.';
    if (err.code === 'account_invalid') msg = "The cleaner's Stripe account is not valid.";
    return res.status(500).json({ error: msg, code: err.code });
  }
}
