import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  'https://zcjwzikydemajehwpegt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (stripeEvent.type) {

      case 'account.updated': {
        const account  = stripeEvent.data.object;
        const userId   = account.metadata?.turnready_user_id;
        const userType = account.metadata?.user_type;
        if (!userId) break;
        const updates = { stripe_account_id: account.id, updated_at: new Date().toISOString() };
        if (account.details_submitted && account.capabilities?.transfers === 'active') {
          updates.stripe_status = 'connected';
          if (userType === 'manager') {
            updates.stripe_business_status  = 'connected';
            updates.stripe_business_account = account.id;
          }
        } else if (account.details_submitted) {
          updates.stripe_status = 'pending_verification';
        }
        await supabase.from('users').update(updates).eq('id', userId);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub       = stripeEvent.data.object;
        const managerId = sub.metadata?.turnready_user_id;
        const plan      = sub.metadata?.plan || 'pro';
        if (!managerId) break;
        const updates = {
          stripe_customer_id:     sub.customer,
          stripe_subscription_id: sub.id,
          subscription_status:    sub.status,
          updated_at: new Date().toISOString(),
        };
        if (sub.status === 'active' || sub.status === 'trialing') {
          updates.plan = plan;
          if (sub.trial_end) updates.trial_end = new Date(sub.trial_end * 1000).toISOString();
        }
        await supabase.from('users').update(updates).eq('id', managerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub       = stripeEvent.data.object;
        const managerId = sub.metadata?.turnready_user_id;
        if (!managerId) break;
        await supabase.from('users')
          .update({ plan: 'cancelled', subscription_status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', managerId);
        break;
      }

      case 'transfer.created': {
        const transfer = stripeEvent.data.object;
        const jobId    = transfer.metadata?.job_id;
        if (!jobId) break;
        await supabase.from('jobs')
          .update({ stripe_transfer_id: transfer.id, paid_at: new Date().toISOString(), status: 'paid' })
          .eq('id', jobId);
        break;
      }

      default:
        console.log(`Unhandled event: ${stripeEvent.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
