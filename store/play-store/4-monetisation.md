# Monetisation

## The rule that decides everything

On Android, Google requires subscriptions for digital features, like Pro, to be bought through **Google Play Billing**. The Android app also must not send people to your website to pay (Google calls this steering). Stripe is fine on the website, but not inside the Android app.

## Release 1: free, no purchases (recommended)

Launch the first version free, with no purchases. It's the quickest review and nothing in it can break Google's payment rules.

- Payments are already switched off in the boss dashboard, so the Pro screen shows "Billing opens soon" and nothing can be bought.
- In Play Console, leave Monetise → Products empty.
- On the store listing, "Contains in-app purchases" will show as No. That's correct for now.
- Keep **"Accept payments" off** in the boss dashboard until release 2 is live. If you switch it on while the Android app has no Play Billing, the app would be breaking Google's rules.

## Release 2: Pro through Google Play

### 1. Set up getting paid (one-off)

1. Play Console → **Setup → Payments profile**. Create a merchant account with your legal name, address and bank account.
2. Add your UK tax details (sole trader or limited company).
3. Optional: under **Setup → Account details**, join the 15% service fee tier for one-off purchases. Subscriptions are always 15%.

Google charges and pays UK VAT for you. The prices you set in Play Console include VAT.

### 2. Create the subscription

Play Console → **Monetise → Products → Subscriptions → Create subscription**.

| Field | Value |
|---|---|
| Product ID | `pro` (permanent, can't be changed) |
| Name | Padel Rival Pro |
| Benefits (shown by Google, up to 4) | Deep court-side and form analytics · Pro share cards and profile badge · Full rival dossiers and alerts · Unlimited AI coach insights |

Then add these **base plans** inside `pro`:

| Base plan ID | Type | Billing period | UK price (inc. VAT) | Who sees it |
|---|---|---|---|---|
| `monthly` | Auto-renewing | 1 month | £4.99 | Everyone |
| `yearly` | Auto-renewing | 1 year | £39.99 | Everyone |
| `monthly-launch` | Auto-renewing | 1 month | £2.99 | Only players inside their offer window |
| `yearly-launch` | Auto-renewing | 1 year | £24.99 | Only players inside their offer window |

On every base plan, set:
- **Grace period** to 7 days.
- **Account hold** to 30 days.
- **Resubscribe** on.
- **Prices for other countries** by letting Google convert from the UK price.

The two launch plans are separate base plans on purpose, not "offers". A subscriber keeps their base plan's price for as long as they stay subscribed, which keeps the promise on your Pro screen. The app decides who's shown them, using the same 15-day rule as the website.

Optional: add a **free trial offer** (for example 7 days, eligibility "New customer acquisition") to the `monthly` and `yearly` plans.

### Your take per sale (approximate)

| Plan | Price | After 20% VAT | After Google's 15% |
|---|---|---|---|
| Monthly | £4.99 | £4.16 | **£3.53** |
| Yearly | £39.99 | £33.33 | **£28.33** |
| Monthly launch | £2.99 | £2.49 | **£2.12** |
| Yearly launch | £24.99 | £20.83 | **£17.70** |

### 3. App work needed for release 2 (I can build this)

1. **A billing plugin** in the Capacitor app, such as RevenueCat (`@revenuecat/purchases-capacitor`) or `cordova-plugin-purchase`, to show the plans and handle buying, restoring and "Manage subscription".
2. **Server check:** a server function that verifies each purchase with the Google Play Developer API. It then writes the player into `pro_members`, which is already built for this.
3. **Renewals and cancellations:** Google's real-time developer notifications (through Google Cloud Pub/Sub) call a webhook, so `pro_members` stays correct when someone renews or cancels.
4. **Hide web checkout inside the Android app:** inside the native app, the Pro screen uses Play Billing only, while the website keeps Stripe.
5. **Update the Play Console forms:** in Data safety, add "Purchase history"; in the content rating, change "digital purchases" to Yes.

## Other ways to earn later

These don't involve Google Play payments:
- Club partnerships: featured listings and club leaderboards, invoiced directly to the club.
- League and tournament fees paid by organisers.

Because these are services sold to businesses outside the app, they generally aren't covered by Google's in-app payment rules.
