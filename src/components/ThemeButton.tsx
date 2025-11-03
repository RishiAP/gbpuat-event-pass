"use client";

import axios from "axios";
import { Moon, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ThemeButton() {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);

  // Initialize theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (prefersDark ? "dark" : "light");

    document.documentElement.classList.toggle("dark", initial === "dark");
    setTheme(initial);
  }, []);

  // Toggle theme
  const toggleTheme = async () => {
    if (!theme) return;

    const next = theme === "light" ? "dark" : "light";

    // Update UI immediately
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setTheme(next);

    // Call API
    try {
      await axios.get(`/api/set-theme?theme=${next}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Something went wrong", {
        position: "top-center",
      });
    }
  };

  if (theme === undefined) return null;

  return (
    <button
      aria-label="Change Theme"
      onClick={toggleTheme}
      className="hover:text-primary transition-colors cursor-pointer"
    >
      {theme === "dark" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}