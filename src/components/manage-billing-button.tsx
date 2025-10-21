"use client";

export default function ManageBillingButton() {
  const openPortal = async () => {
    const res = await fetch("/api/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <button className="rounded border px-4 py-2" onClick={openPortal}>
      Manage billing
    </button>
  );
}
