import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export function WhatsAppFab({ phone, message }: { phone?: string | null; message?: string }) {
  if (!phone) return null;
  const href = `https://wa.me/${phone.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <motion.a
      href={href} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl"
      style={{ background: "#25D366", boxShadow: "0 10px 30px -5px rgba(37, 211, 102, 0.6)" }}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" style={{ background: "#25D366" }} />
      <MessageCircle className="relative h-6 w-6" />
    </motion.a>
  );
}