// Single source of truth for category styling — icon + accent color + gradient.
// Import this anywhere a category needs to render consistently (cards, pills, badges).

export const CATEGORIES = [
  { value: "", label: "All Events", icon: "✨", color: "#6c5ce7", gradient: "linear-gradient(135deg, #6c5ce7, #a855f7)", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80" },
  { value: "Concert", label: "Concerts", icon: "♫", color: "#ec4899", gradient: "linear-gradient(135deg, #ec4899, #f472b6)", image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80" },
  { value: "Seminar", label: "Seminars", icon: "📝", color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80" },
  { value: "Workshop", label: "Workshops", icon: "🔧", color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80" },
  { value: "Conference", label: "Conferences", icon: "💻", color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1, #818cf8)", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80" },
  { value: "Sports", label: "Sports", icon: "⚽", color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #34d399)", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80" },
  { value: "Exhibition", label: "Exhibitions", icon: "🎨", color: "#f43f5e", gradient: "linear-gradient(135deg, #f43f5e, #fb7185)", image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=800&q=80" },
  { value: "Networking", label: "Networking", icon: "🤝", color: "#14b8a6", gradient: "linear-gradient(135deg, #14b8a6, #2dd4bf)", image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80" },
  { value: "General", label: "General", icon: "⭐", color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80" },
];

const BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export function getCategoryMeta(category) {
  return BY_VALUE[category] || CATEGORIES[0];
}
