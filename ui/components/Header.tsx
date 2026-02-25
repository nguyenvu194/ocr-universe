"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, Wallet, User, CreditCard, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/auth.context";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setDropdownOpen(false);
        setMenuOpen(false);
    }, [pathname]);

    const navLinks = [
        { href: "/", label: "Trang chủ" },
        { href: "/workspace", label: "Workspace" },
        { href: "/pricing", label: "Bảng giá" },
    ];

    // Hide header on login/register
    if (pathname === "/login" || pathname === "/register") return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-bg-card/80 backdrop-blur-xl">
            {/* ─── Desktop Header ─── */}
            <div className="hidden md:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-4 items-center h-16">
                        {/* Col 1 (1/4): Logo — left */}
                        <div className="col-span-1 flex justify-start">
                            <Link href="/" className="flex items-center gap-2">
                                <Image
                                    src="/logo.png"
                                    alt="OCR Universe"
                                    width={28}
                                    height={28}
                                    className="shrink-0"
                                />
                                <span className="text-base font-bold text-white tracking-tight">
                                    OCR Universe
                                </span>
                            </Link>
                        </div>

                        {/* Col 2-3 (2/4): Nav — center */}
                        <nav className="col-span-2 flex items-center justify-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                                        ${pathname === link.href
                                            ? "bg-blue-500/10 text-blue-400"
                                            : "text-white/70 hover:text-white hover:bg-white/8"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Col 4 (1/4): Auth — right */}
                        <div className="col-span-1 flex justify-end items-center gap-3">
                            {loading ? (
                                <div className="w-24 h-9 rounded-lg bg-white/5 animate-pulse" />
                            ) : user ? (
                                /* ─── Logged in ─── */
                                <>
                                    {pathname.startsWith("/account/billing") ? (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 h-9">
                                            <Wallet className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-xs font-medium text-white/70">
                                                {(user.balance ?? 0).toLocaleString("vi-VN")}đ
                                            </span>
                                        </div>
                                    ) : (
                                        <Link href="/account/billing" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 h-9 hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer">
                                            <Wallet className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-xs font-medium text-white/70">
                                                {(user.balance ?? 0).toLocaleString("vi-VN")}đ
                                            </span>
                                        </Link>
                                    )}

                                    {/* Avatar + Dropdown */}
                                    <div ref={dropdownRef} className="relative">
                                        <button
                                            onClick={() => setDropdownOpen(!dropdownOpen)}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 h-9 hover:bg-white/8 transition-all duration-200"
                                        >
                                            {user.avatarUrl ? (
                                                <Image
                                                    src={user.avatarUrl}
                                                    alt={user.displayName || "Avatar"}
                                                    width={28}
                                                    height={28}
                                                    className="rounded-full border border-white/10"
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {(user.displayName || user.email)[0].toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-white/80 max-w-[120px] truncate">
                                                {user.displayName || user.email.split("@")[0]}
                                            </span>
                                            <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {dropdownOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/30 py-1.5 animate-fade-in-up">
                                                <Link
                                                    href="/account/profile"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-blue-50/5 transition-all duration-200"
                                                >
                                                    <User className="w-4 h-4 text-blue-500" />
                                                    Account
                                                </Link>
                                                <Link
                                                    href="/account/billing"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-blue-50/5 transition-all duration-200"
                                                >
                                                    <CreditCard className="w-4 h-4 text-blue-500" />
                                                    Billing
                                                </Link>
                                                <div className="my-1.5 border-t border-white/8" />
                                                <button
                                                    onClick={() => { setDropdownOpen(false); logout(); }}
                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Sign out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* ─── Not logged in ─── */
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/login"
                                        className="rounded-lg px-4 py-2 h-9 flex items-center text-sm font-medium text-white/70 transition-all duration-200 hover:text-white hover:bg-blue-50/5"
                                    >
                                        Đăng nhập
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="rounded-lg px-4 py-2 h-9 flex items-center text-sm font-semibold bg-blue-600 text-white transition-all duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile Header ─── */}
            <div className="flex md:hidden items-center justify-between px-4 h-14">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/logo.png"
                        alt="OCR Universe"
                        width={24}
                        height={24}
                    />
                    <span className="text-base font-bold text-white tracking-tight">
                        OCR Universe
                    </span>
                </Link>

                {/* Right: Avatar or Hamburger */}
                <div className="flex items-center gap-2">
                    {user && (
                        pathname.startsWith("/account/billing") ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8">
                                <Wallet className="w-3 h-3 text-blue-400" />
                                <span className="text-xs font-medium text-white/70">
                                    {(user.balance ?? 0).toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        ) : (
                            <Link href="/account/billing" className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer">
                                <Wallet className="w-3 h-3 text-blue-400" />
                                <span className="text-xs font-medium text-white/70">
                                    {(user.balance ?? 0).toLocaleString("vi-VN")}đ
                                </span>
                            </Link>
                        )
                    )}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/8 transition-all duration-200"
                        aria-label="Menu"
                    >
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* ─── Mobile Nav Dropdown ─── */}
            {menuOpen && (
                <div className="border-t border-white/8 px-6 py-4 md:hidden animate-fade-in-up">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                                    ${pathname === link.href
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "text-white/70 hover:text-white hover:bg-blue-50/5"
                                    }`}
                                onClick={() => setMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <hr className="border-white/8 my-2" />
                        {user ? (
                            <>
                                <div className="flex items-center gap-2 px-4 py-2">
                                    {user.avatarUrl ? (
                                        <Image
                                            src={user.avatarUrl}
                                            alt="Avatar"
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                            {(user.displayName || user.email)[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm text-white/80">
                                        {user.displayName || user.email.split("@")[0]}
                                    </span>
                                </div>
                                <Link
                                    href="/account/profile"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 text-left transition-all duration-200 hover:text-white hover:bg-blue-50/5 flex items-center gap-2"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <User className="w-4 h-4 text-blue-500" />
                                    Account
                                </Link>
                                <Link
                                    href="/account/billing"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 text-left transition-all duration-200 hover:text-white hover:bg-blue-50/5 flex items-center gap-2"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <CreditCard className="w-4 h-4 text-blue-500" />
                                    Billing
                                </Link>
                                <button
                                    onClick={() => { logout(); setMenuOpen(false); }}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-red-400 text-left transition-all duration-200 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 text-left transition-all duration-200 hover:text-white hover:bg-blue-50/5"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white text-left transition-all duration-200 hover:bg-blue-500"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Đăng ký
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
