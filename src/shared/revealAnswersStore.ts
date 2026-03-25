import { create } from 'zustand';

type State = {
  revealAll: boolean;
  toggleRevealAll: () => void;
};

export const useRevealAnswersStore = create<State>((set) => ({
  revealAll: false,
  toggleRevealAll: () => set((s) => ({ revealAll: !s.revealAll })),
}));
