import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthGate } from "@/components/AuthPrompt";
import { useFriendIds, useToggleFollow } from "@/hooks/use-friends";
import { cn, haptic } from "@/lib/utils";

export function FollowButton({ meId, id, className }: { meId: string | null; id: string; className?: string }) {
  const { gate } = useAuthGate();
  const friends = useFriendIds(meId);
  const toggle = useToggleFollow(meId);
  if (meId === id) return null;
  const on = friends.data?.includes(id) ?? false;
  return (
    <button
      disabled={toggle.isPending || (!!meId && friends.isLoading)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        haptic();
        if (!gate("Create a free account to add friends and follow their matches.")) return;
        toggle.mutate({ id, on }, { onSuccess: () => toast.success(on ? "Removed from friends" : "Added to friends"), onError: (er) => toast.error(er.message) });
      }}
      className={cn(
        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black uppercase active:scale-95",
        on ? "border-primary bg-primary/15 text-primary" : "bg-card",
        className,
      )}
    >
      {on ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {on ? "Friend" : "Add friend"}
    </button>
  );
}
