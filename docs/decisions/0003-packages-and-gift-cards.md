# ADR 0003: Packages and gift cards — prepaid credits, not special bookings

**Date:** 2026-05-20
**Status:** Proposed (interim shipped: package is inquire-only; full model deferred to Phase 2E)

## Context

Theresa's menu includes a multi-session package ("Neuropathy No More", four sessions, $650). Customers will also want to buy gift cards. Both collect money upfront but are consumed over time, and neither fits the single-session slot picker built in Phase 2B. The question raised: how do booking systems normally do this, and what should we do?

## Decision

Separate **money-in** (one upfront Stripe charge) from **scheduling**. What a customer receives after paying is a *stored credit*, of one of two kinds:

- **Package** = service-specific session credits. Buy once, pay once, then hold N redemptions of a specific service. Sessions are booked over time (all at once, or one now and the rest later); each booking decrements the count, with no charge at booking. Optional expiry (e.g. 6 months). Needs a small new table `PackagePurchase` (serviceId, sessionsTotal, sessionsUsed, customerEmail, code, expiresAt, paymentId).
- **Gift card** = dollar-denominated stored value, not tied to a service. Buy for $X, recipient gets a code worth $X, redeemed at checkout with partial use allowed until exhausted. Reuses the existing `Coupon` table (built for cancellation credits) plus one new field `remainingCents` for partial redemption.

Both purchase flows reuse the Phase 2C Stripe checkout, so they ship together as **Phase 2E** (after single-session payment exists).

**Interim (Phase 2B, no payment yet):** the package is `bookingMode: "inquire"` in Sanity — shown with its $650 price and a contact-to-book button, handled by hand until 2E. Switching it to the real package flow later is a one-field change.

## Consequences

- The existing `Coupon` infrastructure is roughly 90% of a gift card; gift cards add minimal new surface (one column + a purchase flow).
- Packages need one additive table and a redeem-at-booking path. Both are reversible migrations.
- Cancellation credits, gift cards, and (later) promo codes all unify under one "stored credit" idea, which keeps the customer experience and the future /admin reporting consistent.
- Package economics matter: four 90-min Neuropathy sessions at $175 list = $700, sold as a $650 package. That discount only works if the package is modeled as session credits, not as a $650 dollar-value credit (which the customer could spend on anything).
- **Revisit at:** Phase 2C completion (Stripe live), at which point 2E becomes buildable.
