"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    // If email confirmations are ON, user must confirm by email before login.
    router.push("/"); // or show a "check your email" page
  };

  const logIn = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Log in / Sign up</h1>
      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Password</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          className="rounded px-4 py-2 border"
          onClick={logIn}
          disabled={busy}
        >
          Log in
        </button>
        <button
          className="rounded px-4 py-2 border"
          onClick={signUp}
          disabled={busy}
        >
          Sign up
        </button>
      </div>
      <p className="text-xs opacity-70">
        Tip: For local dev, you can temporarily disable “Email confirmations” in
        Supabase Auth → Providers.
      </p>
    </div>
  );
}
