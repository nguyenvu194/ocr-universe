"use client";

/**
 * Providers — Client component wrapper cho tất cả context providers
 *
 * Layout.tsx (Server Component) → Providers (Client Component) → children
 */

import { type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/auth.context";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
    );
}
