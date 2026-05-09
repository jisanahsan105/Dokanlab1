import { MessageCircle } from "lucide-react";

export function WhatsAppFab({ phone, message }: { phone?: string | null; message?: string }) {
  if (!phone) return null;
  const href = `https://wa.me/${phone.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl transition hover:scale-110"
       style={{ background: "#25D366" }} aria-label="Chat on WhatsApp">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}