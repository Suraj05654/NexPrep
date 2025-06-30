"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth.action";

function stringToColor(str: string) {
  // Muted/dark color for dark UI
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Use lower lightness for dark backgrounds
  const color = `hsl(${hash % 360}, 60%, 22%)`;
  return color;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

export default function ProfileDropdown({ name }: { name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    startTransition(async () => {
      await logoutAction();
      router.push("/sign-in");
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    setDeleting(true);
    await fetch("/api/delete-account", { method: "POST" });
    await logoutAction();
    router.push("/sign-in");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 focus:outline-none bg-transparent border-none p-0">
          <span
            className="rounded-full w-9 h-9 flex items-center justify-center text-white font-bold text-base border border-gray-600 shadow"
            style={{ background: stringToColor(name) }}
          >
            {getInitials(name)}
          </span>
          <span className="text-white font-medium text-base">{name}</span>
          <svg className="w-4 h-4 text-gray-300 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-black border border-gray-700 rounded-lg shadow-lg z-50 py-2">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form onSubmit={handleLogout}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              disabled={loading || isPending}
              className="w-full text-left px-4 py-2 text-white hover:bg-red-500 hover:text-white transition-colors rounded-md text-sm font-semibold bg-transparent border-none"
            >
              {(loading || isPending) ? "Logging out..." : "Logout"}
            </button>
          </DropdownMenuItem>
        </form>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-md text-sm font-semibold bg-transparent border-none"
          >
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 