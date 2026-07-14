"use client";

import Link from "next/link";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage({ params }: { params: { scanId: string } }) {
  const { scanId } = params;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Assistant</h1>
          <p className="text-sm text-ink-muted mt-1">Study {scanId.toUpperCase()}</p>
        </div>
        <Link href={`/scan/${scanId}`} className="text-sm text-cyan hover:underline">
          ← Back to study
        </Link>
      </div>

      <ChatWindow scanId={scanId} />
    </div>
  );
}
