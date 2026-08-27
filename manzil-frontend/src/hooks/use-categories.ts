import { useState, useEffect } from "react";
import { fetchCategories, type Categories } from "@/lib/api";

const FALLBACK: Categories = {
  "Property Type": ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio"],
  City_Map: {
    Cairo: {
      Compound_District: [
        "New Cairo",
        "5th Settlement",
        "New Capital",
        "Sheikh Zayed",
        "6th October",
        "Zamalek",
        "Maadi",
        "Heliopolis",
      ],
      Location: [
        "5th Settlement",
        "3rd Settlement",
        "4th Settlement",
        "First Settlement",
        "North Settlement",
        "South Settlement",
      ],
    },
    Giza: {
      Compound_District: ["Sheikh Zayed", "6th October", "Zamalek"],
      Location: ["Sheraton", "Dokki", "Mohandessin"],
    },
    Alexandria: {
      Compound_District: ["San Stefano", "Smouha", "El Maamoura"],
      Location: ["Corniche", "Roushdy", "Sidi Gaber"],
    },
  },
};

export function useCategories() {
  const [categories, setCategories] = useState<Categories>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
