import { create, type StateCreator } from "zustand";

export type Reserva = {
  id: string;          
  area: string;
  profesional: string;
  fechaISO: string;  
  hora: string;       
  modalidad?: string; 
};

type State = {
  reservas: Reserva[];
  add: (r: Reserva) => void;
  remove: (id: string) => void;
  clear: () => void;
  syncFromBackend: (lista: Reserva[]) => void;
};

const creator: StateCreator<State> = (set) => ({
  reservas: [],


  add: (r) =>
    set((prev: State) => {
      const nueva: Reserva = { ...r };
      const ordenadas = [...prev.reservas, nueva].sort((a, b) =>
        (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)
      );
      return { reservas: ordenadas };
    }),

  remove: (id: string) =>
    set((prev: State) => ({
      reservas: prev.reservas.filter((x) => x.id !== id),
    })),

  clear: () => set({ reservas: [] }),

  syncFromBackend: (lista) =>
    set(() => {
      const ordenadas = [...lista].sort((a, b) =>
        (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)
      );
      return { reservas: ordenadas };
    }),
});

export const useReservas = create<State>(creator);
