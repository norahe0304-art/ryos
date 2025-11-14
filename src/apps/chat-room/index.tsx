import { BaseApp } from "../base/types";
import { ChatRoomAppComponent } from "./components/ChatRoomAppComponent";

export const helpItems = [
  {
    icon: "💬",
    title: "Chat Room",
    description: "Enter your name and start chatting with a retro AI companion.",
  },
  {
    icon: "🤖",
    title: "Retro AI",
    description: "Chat with a cynical AI from the early internet era. It remembers dial-up modems and IRC chat rooms.",
  },
  {
    icon: "⌨️",
    title: "Type & Send",
    description: "Type your message and press Enter or click the send button to chat.",
  },
  {
    icon: "💾",
    title: "Your Name",
    description: "Your name is saved locally and will be remembered for future sessions.",
  },
];

export const appMetadata = {
  name: "Chat Room",
  version: "1.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/default/question.png",
};

export const ChatRoomApp: BaseApp = {
  id: "chat-room",
  name: "Chat Room",
  icon: { type: "image", src: appMetadata.icon },
  description: "Chat with a retro cynical AI from the early internet era",
  component: ChatRoomAppComponent,
  helpItems,
  metadata: appMetadata,
};

