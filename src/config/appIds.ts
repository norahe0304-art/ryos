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
] as const;

export type AppId = (typeof appIds)[number];
