export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const LEAD_STATUSES = {
  new: { label: "New", color: "blue" },
  pitched: { label: "Pitched", color: "yellow" },
  interested: { label: "Interested", color: "green" },
  rejected: { label: "Rejected", color: "red" },
  landed: { label: "Landed", color: "purple" },
};

export const BUSINESS_CATEGORIES = [
  "restaurant",
  "retail",
  "salon",
  "gym",
  "real_estate",
  "automotive",
  "health",
  "fashion",
  "tech",
  "construction",
  "other",
];

export const FREELANCER_SERVICES = [
  "Web Development",
  "Mobile App Development",
  "Brand Design",
  "Social Media Management",
  "SEO / Digital Marketing",
  "Copywriting",
  "Video Production",
  "Photography",
  "Bookkeeping",
  "Consulting",
];

export const FREE_TIER_LIMITS = {
  ai_pitches_per_month: 5,
  lead_monitors: 2,
  business_searches_per_day: 10,
};
