import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
  link?: { label: string; href: string };
};

type ToastContextType = {
  addToast: (
    type: ToastType,
    message: string,
    link?: { label: string; href: string }
  ) => void;
};

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      type: ToastType,
      message: string,
      link?: { label: string; href: string }
    ) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message, link }]);
      if (type !== "error") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
      }
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-primary shrink-0" />,
    error: <XCircle className="w-5 h-5 text-negative shrink-0" />,
    info: <Info className="w-5 h-5 text-secondary shrink-0" />,
  };

  const borderMap = {
    success: "border-l-primary",
    error: "border-l-negative",
    info: "border-l-secondary",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-card rounded-xl shadow-lg border-l-4 ${borderMap[t.type]} p-4 flex items-start gap-3 animate-fade-in`}
          >
            {iconMap[t.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">{t.message}</p>
              {t.link && (
                <a
                  href={t.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-secondary hover:underline mt-1 inline-block"
                >
                  {t.link.label}
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
