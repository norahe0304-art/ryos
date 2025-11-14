import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Game {
  id: string;
  name: string;
  path: string;
  image: string;
  type: "dos" | "nes" | "other";
  description?: string;
  year?: number;
}

const DEFAULT_GAMES: Game[] = [
  // DOS Games
  {
    id: "doom",
    name: "Doom",
    path: "/assets/games/jsdos/doom.jsdos",
    image: "/assets/games/images/doom.webp",
    type: "dos",
    description: "Classic first-person shooter",
    year: 1993,
  },
  {
    id: "simcity2000",
    name: "SimCity 2000",
    path: "/assets/games/jsdos/simcity2000.jsdos",
    image: "/assets/games/images/simcity2000.webp",
    type: "dos",
    description: "Classic city-building simulation",
    year: 1993,
  },
  {
    id: "mario-luigi",
    name: "Mario & Luigi",
    path: "/assets/games/jsdos/mario-luigi.jsdos",
    image: "/assets/games/images/mario.webp",
    type: "dos",
    description: "Super Mario Bros",
    year: 1985,
  },
  {
    id: "ageofempires",
    name: "Age of Empires",
    path: "/assets/games/jsdos/aoe.jsdos",
    image: "/assets/games/images/aoe.webp",
    type: "dos",
    description: "Classic real-time strategy",
    year: 1997,
  },
  {
    id: "ageofempires2",
    name: "Age of Empires II",
    path: "/assets/games/jsdos/aoe2.jsdos",
    image: "/assets/games/images/aoe2.webp",
    type: "dos",
    description: "Age of Empires II",
    year: 1999,
  },
  {
    id: "princeofpersia",
    name: "Prince of Persia",
    path: "/assets/games/jsdos/prince.jsdos",
    image: "/assets/games/images/prince.webp",
    type: "dos",
    description: "Prince of Persia",
    year: 1989,
  },
  {
    id: "aladdin",
    name: "Aladdin",
    path: "/assets/games/jsdos/aladdin.jsdos",
    image: "/assets/games/images/aladdin.webp",
    type: "dos",
    description: "Aladdin",
    year: 1993,
  },
  {
    id: "oregontrail",
    name: "The Oregon Trail",
    path: "/assets/games/jsdos/oregon-trail.jsdos",
    image: "/assets/games/images/oregon-trail.webp",
    type: "dos",
    description: "The Oregon Trail",
    year: 1990,
  },
  {
    id: "commandandconquer",
    name: "Command & Conquer",
    path: "/assets/games/jsdos/command-conquer.jsdos",
    image: "/assets/games/images/command-conquer.webp",
    type: "dos",
    description: "Command & Conquer",
    year: 1995,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    path: "app:minesweeper",
    image: "/icons/default/minesweeper.png",
    type: "other",
    description: "Minesweeper",
    year: 1990,
  },
  // You can add more games here, including NES games, etc.
  // Note: When adding new games, make sure the corresponding .jsdos and .webp files exist in the public/assets/games/ directory
];

interface GamesStoreState {
  games: Game[];
  setGames: (games: Game[]) => void;
}

export const useGamesStore = create<GamesStoreState>()(
  persist(
    (set) => ({
      games: DEFAULT_GAMES,
      setGames: (games) => set({ games }),
    }),
    {
      name: "ryos:games",
      partialize: (state) => ({ games: state.games }),
    }
  )
);

// Helper functions
export const loadGames = (): Game[] => {
  return useGamesStore.getState().games;
};

export const saveGames = (games: Game[]): void => {
  useGamesStore.getState().setGames(games);
};

