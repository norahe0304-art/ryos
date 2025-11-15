export const appIds = [
  "finder",
  "soundboard",
  "internet-explorer",
  "chats",
  "textedit",
  "paint",
  "photo-booth",
  "minesweeper",
  "videos",
  "ipod",
  "synth",
  "pc",
  "terminal",
  "applet-viewer",
  "control-panels",
  "games",
  "chat-room",
  "message-in-bottle",
] as const;

export type AppId = (typeof appIds)[number];
