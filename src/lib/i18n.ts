export type Lang = "en" | "bn";

export const T = {
  en: {
    products: "Products", buyNow: "Buy Now", checkout: "Checkout", cod: "Cash on Delivery",
    name: "Name", phone: "Phone", address: "Address", notes: "Notes (optional)", placeOrder: "Place Order",
    qty: "Quantity", total: "Total", thankYou: "Thank you! Your order has been placed.",
    chatWa: "Chat on WhatsApp", noProducts: "No products yet.", back: "Back",
    download: "Download", details: "Details",
  },
  bn: {
    products: "পণ্যসমূহ", buyNow: "এখনই কিনুন", checkout: "চেকআউট", cod: "ক্যাশ অন ডেলিভারি",
    name: "নাম", phone: "ফোন", address: "ঠিকানা", notes: "নোট (ঐচ্ছিক)", placeOrder: "অর্ডার করুন",
    qty: "পরিমাণ", total: "মোট", thankYou: "ধন্যবাদ! আপনার অর্ডার গৃহীত হয়েছে।",
    chatWa: "WhatsApp এ চ্যাট", noProducts: "কোন পণ্য নেই।", back: "ফিরে যান",
    download: "ডাউনলোড", details: "বিস্তারিত",
  },
} as const;