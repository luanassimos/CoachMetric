import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
};

export default function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && resolvedTheme === "light";

  function toggleTheme() {
    setTheme(isLight ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
      }
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {!mounted ? (
        <Moon className="h-4 w-4" />
      ) : isLight ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}