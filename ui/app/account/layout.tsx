"use client";

/**
 * Account Layout
 *
 * Shared layout for /account/* pages.
 * Left sidebar with nav items (Account, Billing, Sign out).
 * Right pane renders the child page.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth.context";

const sidebarItems = [
    { href: "/account/profile", label: "Account", icon: User },
    { href: "/account/billing", label: "Billing", icon: CreditCard },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-white/70">Vui lòng đăng nhập để xem trang này.</p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row -mx-4 sm:-mx-6 lg:-mx-8">
            {/* ─── Sidebar ─── */}
            <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-white/8 bg-bg-card/40">
                <div className="p-4 md:p-6 md:sticky md:top-20">
                    {/* User avatar + name */}
                    <div className="flex items-center gap-3 mb-6 px-2">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full border border-white/10"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                                {(user.displayName || user.email)[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {user.displayName || user.email.split("@")[0]}
                            </p>
                            <p className="text-xs text-white/60 truncate">{user.email}</p>
                        </div>
                    </div>

                    {/* Nav items */}
                    <nav className="flex md:flex-col gap-1">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                        ${isActive
                                            ? "bg-blue-500/10 text-blue-400"
                                            : "text-white/80 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-white/60"}`} />
                                    {item.label}
                                </Link>
                            );
                        })}

                        {/* Divider */}
                        <div className="hidden md:block my-2 border-t border-white/8" />

                        {/* Sign out */}
                        <button
                            onClick={logout}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 w-full text-left"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </nav>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                {children}
            </main>
        </div>
    );
}
