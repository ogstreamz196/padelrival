import { useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildShareText, copyText, shareMatchCard, whatsappUrl, type ShareData } from "@/lib/share";

export function ShareResult({ data }: { data: ShareData }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid grid-cols-3 gap-2">
      <a
        href={whatsappUrl(buildShareText(data))}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-1 rounded-2xl border bg-card py-3 text-xs font-bold active:scale-95"
      >
        <Share2 className="size-5 text-primary" />
        WhatsApp
      </a>
      <button
        onClick={async () => {
          const ok = await copyText(buildShareText(data));
          toast[ok ? "success" : "error"](ok ? "Match summary copied" : "Could not copy");
        }}
        className="flex flex-col items-center gap-1 rounded-2xl border bg-card py-3 text-xs font-bold active:scale-95"
      >
        <Copy className="size-5 text-primary" />
        Copy text
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await shareMatchCard(data);
          setBusy(false);
          if (r === "downloaded") toast.success("Match card saved to your device");
          if (r === "failed") toast.error("Could not create the match card");
        }}
        className="flex flex-col items-center gap-1 rounded-2xl border bg-card py-3 text-xs font-bold active:scale-95 disabled:opacity-50"
      >
        <Download className="size-5 text-primary" />
        {busy ? "Making…" : "Story card"}
      </button>
    </div>
  );
}
