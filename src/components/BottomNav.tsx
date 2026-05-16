import { Link } from "@tanstack/react-router";
import { Home, Dumbbell, Apple, TrendingUp, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-center justify-between px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110" strokeWidth={2.2} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
