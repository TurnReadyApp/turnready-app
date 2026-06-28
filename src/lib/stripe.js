import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const PLANS = {
  solo: {
    name: 'Solo',
    price: 29,
    priceId: import.meta.env.VITE_STRIPE_SOLO_PRICE,
    limits: { properties: 3, cleaners: 5 },
    features: ['1 manager', 'Up to 3 properties', 'Up to 5 cleaners', 'Job assignment', 'Stripe payments', 'Basic reporting']
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE,
    limits: { properties: 10, cleaners: Infinity },
    features: ['1 manager', 'Up to 10 properties', 'Unlimited cleaners', 'iCal sync', 'Auto-assign backup', 'Full reporting', 'AI assistant']
  },
  agency: {
    name: 'Agency',
    price: 99,
    priceId: import.meta.env.VITE_STRIPE_AGENCY_PRICE,
    limits: { properties: Infinity, cleaners: Infinity },
    features: ['Multiple managers', 'Unlimited properties', 'Unlimited cleaners', 'Everything in Pro', 'White label', 'Priority support']
  }
}

export async function redirectToCheckout(priceId, email) {
  const stripe = await stripePromise
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/app?checkout=success`,
    cancelUrl: `${window.location.origin}/pricing`,
    customerEmail: email,
    trialPeriodDays: 7
  })
  if (error) throw error
}

export function getPlanLimits(plan) {
  return PLANS[plan]?.limits || PLANS.solo.limits
}

export function checkPlanLimit(plan, type, currentCount) {
  const limits = getPlanLimits(plan)
  return currentCount < limits[type]
}
