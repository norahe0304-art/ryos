import { BaseApp } from "../base/types";
import { GamesAppComponent } from "./components/GamesAppComponent";

export const appMetadata = {
  name: "Games",
  version: "1.0.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/default/games.png",
};

export const helpItems = [
  {
    icon: "🎮",
    title: "Games Collection",
    description: "Classic millennium games collection, including Super Mario and other classic games",
  },
  {
    icon: "⌨️",
    title: "Keyboard Controls",
    description: "Use keyboard for game controls",
  },
  {
    icon: "🖱️",
    title: "Mouse Capture",
    description: "Click inside the game window to capture/release mouse",
  },
  {
    icon: "⛶",
    title: "Full Screen Mode",
    description: "Toggle View ▸ Full Screen for immersive experience",
  },
];

export const GamesApp: BaseApp = {
  id: "games",
  name: "Games",
  icon: { type: "image", src: "/icons/default/games.png" },
  description: "Classic millennium games collection",
  component: GamesAppComponent,
  windowConstraints: {
    minWidth: 640,
    minHeight: 480,
  },
  helpItems,
  metadata: appMetadata,
};

