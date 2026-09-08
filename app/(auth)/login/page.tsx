"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardBase } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ButtonPrimary } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Email atau kata sandi tidak valid.");
        setLoading(false);
        return;
      }

      if (data?.session) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMsg("Terjadi kesalahan sistem saat mencoba masuk.");
      setLoading(false);
    }
  };

  return (
    <CardBase className="p-8 shadow-elevation-2 space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-text-primary">
          Masuk ke Akun
        </h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Lanjutkan pemantauan dan pengelolaan airdrop aktifmu.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-badge-bg-overdue border border-status-overdue text-status-overdue text-body-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="nama@email.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <Input
          label="Kata Sandi"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <div className="pt-2">
          <ButtonPrimary
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Workspace</span>
            )}
          </ButtonPrimary>
        </div>
      </form>

      <div className="border-t border-border-hairline pt-4 text-center text-body-sm text-text-secondary">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="text-link-teal hover:underline font-medium"
        >
          Daftar sekarang
        </Link>
      </div>
    </CardBase>
  );
}
