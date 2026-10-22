# Padel Rival on Google Play: the full kit

Everything needed to publish Padel Rival on Google Play, set up as a fresh app. Work through the steps in order. Each one points to the file that has the exact text or answers to paste.

| File | What it's for |
|---|---|
| [1-store-listing.md](1-store-listing.md) | App name, descriptions, category, contact details, release notes |
| [2-app-content.md](2-app-content.md) | Every policy form: privacy, app access, ads, content rating, target audience, account deletion |
| [3-data-safety.md](3-data-safety.md) | The Data safety form, answer by answer |
| [4-monetisation.md](4-monetisation.md) | Payments for release 1 and the Pro subscription setup for release 2 |
| `graphics/icon-512.png` | Play Store icon |
| `graphics/feature-graphic-1024x500.png` | Feature graphic |
| `graphics/phone-screenshots/` | 8 phone screenshots, 1080 × 1920, in upload order |

## Already done in the code

- **Package name** is now `uk.co.padelrival.app` across Android, iOS and Capacitor. Google fixes this permanently after your first upload.
- **Launcher icons** are replaced at every density with your padel logo. Before this they were Capacitor's placeholder blue X. The adaptive icon uses a navy background (`#01113F`).
- **Splash screen** is navy with your logo, including the Android 12+ system splash, so there's no white flash.
- **Missing theme colours** that would have broken the Android Studio build are now defined.
- **Account deletion page** is live at `/delete-account`, which Google requires.
- **Privacy policy** is updated to cover the AI coach, open matches, check-ins and public profiles.

## Step 1: Google Play developer account (if you don't have one)

1. Go to play.google.com/console and sign up. It's a one-off US$25 fee.
2. Choose **Personal** or **Organisation**. An organisation needs a D-U-N-S number but skips the testing rule in step 5.
3. Complete identity verification. This can take a few days.

## Step 2: Build the app in Android Studio

1. Install the latest **Android Studio**.
2. Get the latest code from GitHub, then in a terminal at the project folder run:
   ```
   bun install
   npx cap sync android
   ```
3. In Android Studio, choose **File → Open** and select the `android` folder. Let Gradle finish syncing.
4. Open `android/app/build.gradle` and check `versionCode 1` and `versionName "1.0"`. Every later upload needs a higher `versionCode` (2, 3, 4…).
5. **Test on a real phone.** Turn on developer mode and USB debugging, plug the phone in, and press Run. Check these:
   - It opens on Home with your icon and the navy splash.
   - Sign-up and sign-in with a username both work. Google sign-in is hidden in the app on purpose.
   - The back button goes back a screen, and from Home it tucks the app away like other apps do.
   - Recording a match and posting an open match both work.
6. **Create your upload key.** Go to **Build → Generate Signed App Bundle or APK → Android App Bundle → Create new**.
   - Save the `.jks` file and both passwords somewhere safe, such as a password manager and a backup.
   - You need this key for every future update. Losing it means a slow reset through Google support.
7. Build the **release** bundle. You'll get `android/app/release/app-release.aab`.

## Step 3: Create the app in Play Console

**Create app**, then fill in:

| Field | Value |
|---|---|
| App name | Padel Rival: Scores & Ratings |
| Default language | English (United Kingdom) – en-GB |
| App or game | App |
| Free or paid | Free (this can't be changed to paid later; Pro will be an in-app subscription) |
| Declarations | Tick the developer policy and US export law boxes |

## Step 4: Fill in the dashboard tasks

1. **Store listing:** use [1-store-listing.md](1-store-listing.md) and upload everything in `graphics/`.
2. **App content:** use [2-app-content.md](2-app-content.md) and [3-data-safety.md](3-data-safety.md). Create the `playreview` account first.
3. **App category and contact details:** these are in the store listing file.
4. **Monetisation:** nothing to do for release 1. See [4-monetisation.md](4-monetisation.md).

## Step 5: Testing tracks

1. **Internal testing:**
   - Create a release and upload `app-release.aab`.
   - Accept **Play App Signing** when asked.
   - Add your own email as a tester, roll it out, and install from the opt-in link to check the Play version.
2. **Closed testing (required for most new personal accounts):**
   - Google requires a closed test with at least **12 testers opted in for 14 days in a row** before you can apply for production. Check the exact numbers Play Console shows you, because Google has changed them before.
   - Create a closed testing track, upload the same bundle and add testers by email or a Google Group.
   - Your padel group chat is ideal. Ask them to install from the opt-in link, keep the app, and use it a few times over the two weeks.
3. When the 14 days are up, choose **Apply for production**. You'll answer a few questions about how testing went, so it helps to note any feedback testers gave.

## Step 6: Production release

1. **Production → Create new release:** upload the bundle and paste the release notes.
2. **Countries:** start with the United Kingdom. You can add more countries later.
3. **Review:** send it for review. New apps usually take a few days.

## Before you submit: things that could cause a rejection

1. **Report and block is built.** Every player card, open match and feed match has a ··· menu to report it or block the player, and reports land in the boss dashboard under Reports. Check that tab every day or two while the app is in review, because Google expects reports to be handled. The database part is migration `0006_report_and_block`, which Lovable applies.
2. **"Just a website in an app."** Google can reject apps that are only a website in a frame. Padel Rival handles the back button, shows an offline notice and uses native touches such as haptics and the splash screen, which usually passes. Push notifications would make it safer still.
3. **Sign-in settings.** Your sign-in (auth) settings must allow `padelrival.co.uk`, so that sign-up confirmations and password resets open the right place.

## After launch

- Each web update reaches the Android app straight away, because the app loads padelrival.co.uk. You only need a new Play upload when native parts change, such as icons, permissions, plugins or billing.
- Reply to reviews in Play Console. It helps your ranking.
- Watch **Quality → Android vitals** for crashes in the first week.
