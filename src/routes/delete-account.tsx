import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage } from "@/components/PublicPage";
import { seo } from "@/lib/seo";

const EMAIL = "Ogbot196@gmail.com";

// Public page required by Google Play's account deletion policy: it must explain how to delete
// an account and its data without needing the app installed.
export const Route = createFileRoute("/delete-account")({
  staticData: { sitemap: true },
  head: () =>
    seo({
      title: "Delete your Padel Rival account",
      description: "How to delete your Padel Rival account and the data linked to it, in the app or by email.",
      path: "/delete-account",
    }),
  component: DeleteAccount,
});

function DeleteAccount() {
  return (
    <PublicPage>
      <h1 className="text-3xl font-black leading-tight">Delete your Padel Rival account</h1>
      <p className="mt-3 text-muted-foreground">
        You can delete your account at any time, from the app or by email. Deleting is permanent.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-black">Delete it in the app</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Sign in to Padel Rival in the app or at padelrival.co.uk.</li>
          <li>
            Open <span className="font-bold text-foreground">Profile</span> and tap{" "}
            <span className="font-bold text-foreground">Edit</span>.
          </li>
          <li>
            Scroll down and tap <span className="font-bold text-foreground">Delete my account</span>, then confirm.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">Your account is removed straight away.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Or ask us by email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Email{" "}
          <a href={`mailto:${EMAIL}?subject=Delete%20my%20Padel%20Rival%20account`} className="font-bold text-primary underline">
            {EMAIL}
          </a>{" "}
          from the address on your account, or include your @username. We'll delete it within 30 days and confirm by
          email.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">What gets deleted</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Your login, email address and password.</li>
          <li>Your profile: display name, username, avatar, court side and privacy settings.</li>
          <li>Your rating, XP, streaks, badges and Pro membership.</li>
          <li>Your friends list, club check-ins, open matches you posted or joined, reactions and notifications.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">What we keep</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Matches you played in stay on the other players' records, because they're part of their history too. Your
          name stays on those matches only as a plain guest name, with no link to you, your email or your account.
          Backup copies are cleared on our provider's normal backup cycle, and security logs are kept for up to 12
          months.
        </p>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        More detail is in our{" "}
        <Link to="/privacy" className="font-bold text-primary underline">
          privacy policy
        </Link>
        .
      </p>
    </PublicPage>
  );
}
