"use client";

import { Moon, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label="Change Theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="hover:text-primary transition-colors cursor-pointer"
    >
      {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}