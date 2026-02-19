import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="surface-card rounded-3xl flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-secondary" />
      </div>
      <h3 className="text-xl text-display font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
