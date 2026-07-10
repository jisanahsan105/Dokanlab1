import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  qty: number;
};

const key = (slug: string) => `cart:${slug}`;

function read(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(slug: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(slug), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(`cart-changed:${slug}`));
}

export function useCart(slug: string) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read(slug));
    const onChange = () => setItems(read(slug));
    const evt = `cart-changed:${slug}`;
    window.addEventListener(evt, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(evt, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [slug]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const current = read(slug);
    const idx = current.findIndex((c) => c.id === item.id);
    if (idx >= 0) current[idx].qty += qty;
    else current.push({ ...item, qty });
    write(slug, current);
  }, [slug]);

  const setQty = useCallback((id: string, qty: number) => {
    const current = read(slug).map((c) => (c.id === id ? { ...c, qty: Math.max(1, qty) } : c));
    write(slug, current);
  }, [slug]);

  const remove = useCallback((id: string) => {
    write(slug, read(slug).filter((c) => c.id !== id));
  }, [slug]);

  const clear = useCallback(() => write(slug, []), [slug]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * Number(i.price), 0);

  return { items, add, setQty, remove, clear, count, subtotal };
}
