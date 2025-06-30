import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated, getCurrentUser } from "@/lib/actions/auth.action";
import ProfileDropdown from "@/components/ProfileDropdown";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  const user = await getCurrentUser();

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between py-4 px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="NexPrep Logo" width={38} height={32} />
          <h2 className="text-primary-100">NexPrep</h2>
        </Link>
        <div className="flex items-center gap-4">
          <ProfileDropdown name={user?.name || "User"} />
        </div>
      </nav>
      {children}
    </div>
  );
};

export default Layout;
