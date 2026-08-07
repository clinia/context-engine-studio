import { ChatPanel } from "@/components/chat/chat-panel";
import { loadSessionMessages } from "@/lib/chat/actions";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ patientId: string; id: string }>;
}) {
  const { patientId: rawPatientId, id } = await params;
  const patientId = decodeURIComponent(rawPatientId);

  // Seed the chat with its persisted transcript from the studio-local store; an
  // error (or a brand-new chat) still yields an empty, usable chat.
  const loaded = await loadSessionMessages(patientId, id);
  const initialMessages = loaded.ok ? loaded.data : [];

  return (
    <div className="h-svh min-h-0">
      <ChatPanel patientId={patientId} sessionId={id} initialMessages={initialMessages} />
    </div>
  );
}
