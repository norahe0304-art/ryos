import { BaseApp } from "../base/types";
import { MessageInBottleAppComponent } from "./components/MessageInBottleAppComponent";

export const helpItems = [
  {
    icon: "🌊",
    title: "Throw a Bottle",
    description: "Write your message and throw it into the sea. It will be shared with everyone.",
  },
  {
    icon: "🎣",
    title: "Pick Up a Bottle",
    description: "Cast your net to randomly pick up a message from the sea.",
  },
  {
    icon: "💬",
    title: "Share Messages",
    description: "All messages are shared globally. Anyone can pick up your bottle.",
  },
  {
    icon: "⏰",
    title: "Timestamps",
    description: "Each bottle shows when it was thrown into the sea.",
  },
];

export const appMetadata = {
  name: "TextBottle",
  version: "1.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/default/file-text.png",
};

export const MessageInBottleApp: BaseApp = {
  id: "message-in-bottle",
  name: "TextBottle",
  icon: { type: "image", src: appMetadata.icon },
  description: "Throw messages into the sea and pick up bottles from others",
  component: MessageInBottleAppComponent,
  helpItems,
  metadata: appMetadata,
};

