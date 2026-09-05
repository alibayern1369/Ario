import { create } from 'zustand';

type Toast = { id: string; text: string };

type ToastState = {
  items: Toast[];
  push: (text: string) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (text) => {
    const id = crypto.randomUUID();
    set((s) => ({ items: [...s.items, { id, text }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 3600);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
