# App content (policy declarations)

Play Console → Policy and programs → App content. Work through every card until each says "Completed".

## Privacy policy

```
https://padelrival.co.uk/privacy
```

## Ads

**Does your app contain ads?** No.

## App access

Select **"All or some functionality is restricted"**, because recording matches, profiles, friends, open matches and check-ins need an account.

Before you submit, create a review account in the app:
1. Sign up with the username `playreview`.
2. Set a password.
3. Record one match with a couple of guest names so the screens aren't empty.

Then add this instruction in Play Console:

| Field | Value |
|---|---|
| Name | Reviewer account |
| Username | playreview |
| Password | (the password you set) |
| Any other information | Tap Profile → Sign in, choose "@username or email", enter the details above. No two-step verification. Most screens can also be browsed without signing in. |

Keep this account working for as long as the app is live. Google re-checks it on later updates.

## Content rating (IARC questionnaire)

| Question | Answer |
|---|---|
| Email for the rating certificate | Ogbot196@gmail.com |
| Category | All other app types (it isn't a game) |
| Violence, fear, sexuality, language, drugs, gambling | No to all |
| Does the app let users interact or exchange content? | **Yes.** Players see each other's names, avatars, matches and open-match notes |
| Does the app share the user's current location with other users? | **Yes.** "I'm playing today" shows which club a player chose (it's optional and isn't GPS, but answering yes is the honest choice) |
| Does the app allow users to buy digital goods? | **No** for the first release. Change to **Yes** when Pro goes on sale in the app |
| Unrestricted internet or web browsing? | No |
| Is this a news app? | No |

Expected result: PEGI 3 / Everyone, with the notices "Users Interact" and "Shares Location".

## Target audience and content

| Question | Answer |
|---|---|
| Target age groups | **18 and over** (recommended for the quickest review; the privacy policy allows 13+, so you can add 16–17 later) |
| Could the app unintentionally appeal to children? | No |
| Store listing aimed at children? | No |

Choosing only 18+ keeps the app out of Google's Families programme and its extra rules.

## Data safety

Fill it in using [3-data-safety.md](3-data-safety.md).

## Account deletion

| Field | Value |
|---|---|
| Can users create an account in your app? | Yes |
| Delete account URL | `https://padelrival.co.uk/delete-account` |
| Can users request deletion of some data without deleting the account? | Yes. They can remove friends, cancel open matches, undo check-ins and clear notifications in the app, and delete their own match within 15 minutes of logging it |

## Advertising ID

**Does your app use an advertising ID?** No. The app has no ads and no ad SDKs, so the Android manifest doesn't need the `AD_ID` permission.

## Other declarations

| Card | Answer |
|---|---|
| Government app | No |
| Financial features | None of the above |
| Health apps | My app does not have any health features (it records match results, not health or fitness data) |
| News app | No |
| COVID-19 contact tracing or status | Not a COVID app |
| Data deletion (Families) | Not applicable |
| Photo and video permissions | Not used |
| Foreground service / exact alarms / full-screen intent | Not used |

## User-generated content: read before you submit

Players can see each other's display names, avatars and open-match notes. Google's user-generated content policy expects apps like this to offer three things:
- A way to report another player or their content.
- A way to block another player.
- Terms that forbid abuse.

All three are in place:
- **Report:** the ··· button on any player card, open match or match in the feed. Players pick a reason and can add details. Reports are private and go to the boss dashboard's Reports tab.
- **Block:** the same ··· menu. A blocked player's open matches and matches disappear for you, they can't join your games, and any follow between you is removed. Players can unblock from Settings → Blocked players.
- **Terms:** the terms page forbids abuse and fake results.

If the review form asks how you moderate, say that reports are reviewed by the developer within 24 hours and accounts can be suspended or deleted from the admin dashboard.
