import { useState, useEffect, useRef } from "react";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { GamesMenuBar } from "./GamesMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";
import { Game, loadGames } from "../stores/useGamesStore";
import { motion } from "framer-motion";
import { useJsDos, DosProps, DosEvent } from "../../pc/hooks/useJsDos";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useFilesStore } from "@/stores/useFilesStore";
import { toast } from "sonner";

export function GamesAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isScriptLoaded } = useJsDos();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isMouseCaptured, setIsMouseCaptured] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentRenderAspect, setCurrentRenderAspect] = useState("4/3");
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  const filterType: "all" = "all";
  const containerRef = useRef<HTMLDivElement>(null);
  const dosPropsRef = useRef<DosProps | null>(null);
  const launchApp = useLaunchApp();
  const fileStore = useFilesStore();
  const [_contextMenuGame, setContextMenuGame] = useState<Game | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  useEffect(() => {
    // Cleanup dosbox instance when window is closed
    if (!isWindowOpen && dosPropsRef.current) {
      console.log("Stopping dosbox instance...");
      dosPropsRef.current
        .stop()
        .then(() => {
          console.log("Dosbox instance stopped");
          dosPropsRef.current = null;
          setIsGameRunning(false);
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }
        })
        .catch((error) => {
          console.error("Error stopping dosbox:", error);
          dosPropsRef.current = null;
          setIsGameRunning(false);
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }
        });
    }
  }, [isWindowOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dosPropsRef.current) {
        console.log("Cleaning up dosbox instance on unmount...");
        dosPropsRef.current.stop().catch(console.error);
        dosPropsRef.current = null;
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    };
  }, []);

  useEffect(() => {
    // If there's a pending game and the script is loaded, try loading it
    if (isScriptLoaded && pendingGame) {
      console.log("Loading pending game:", pendingGame);
      handleLoadGame(pendingGame);
      setPendingGame(null);
    }
  }, [isScriptLoaded, pendingGame]);

  const handleSetMouseCapture = (capture: boolean) => {
    setIsMouseCaptured(capture);
    if (dosPropsRef.current) {
      dosPropsRef.current.setMouseCapture(capture);
    }
  };

  const handleSetFullScreen = (fullScreen: boolean) => {
    setIsFullScreen(fullScreen);
    if (dosPropsRef.current) {
      dosPropsRef.current.setFullScreen(fullScreen);
    }
  };

  const handleSetRenderAspect = (aspect: string) => {
    setCurrentRenderAspect(aspect);
    if (dosPropsRef.current) {
      dosPropsRef.current.setRenderAspect(aspect);
    }
  };

  const handleSetMouseSensitivity = (sensitivity: number) => {
    setMouseSensitivity(sensitivity);
    if (dosPropsRef.current) {
      dosPropsRef.current.setMouseSensitivity(sensitivity);
    }
  };

  const handleLoadGame = async (game: Game) => {
    // Handle other type games (like Minesweeper app)
    if (game.type === "other" && game.path.startsWith("app:")) {
      const appId = game.path.replace("app:", "") as any;
      console.log(`Launching app: ${appId}`);
      launchApp(appId);
      return;
    }

    // Only support DOS games for now
    if (game.type !== "dos") {
      console.warn(`Game type ${game.type} not yet supported`);
      return;
    }

    setSelectedGame(game);
    setIsGameRunning(true);
    if (!containerRef.current) {
      console.error("Container ref is null");
      return;
    }
    if (!window.Dos) {
      console.error("Dos function is not available");
      if (!isScriptLoaded) {
        console.log("Script not loaded yet, queuing game load...");
        setPendingGame(game);
        return;
      }
      return;
    }
    if (!isScriptLoaded) {
      console.log("Script not fully loaded yet, queuing game load...");
      setPendingGame(game);
      return;
    }

    try {
      console.log("Starting game load...");
      console.log("Selected game:", game);
      setIsLoading(true);

      // Stop existing instance if any
      if (dosPropsRef.current) {
        console.log("Stopping existing instance...");
        await dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }

      // Clear container and wait for next tick
      containerRef.current.innerHTML = "";
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start new instance
      console.log("Creating new Dos instance...");
      const options = {
        url: game.path,
        theme: "dark",
        renderAspect: currentRenderAspect,
        renderBackend: "webgl",
        imageRendering: "pixelated",
        mouseCapture: isMouseCaptured,
        mouseSensitivity: mouseSensitivity,
        workerThread: true,
        autoStart: true,
        kiosk: true,
        onEvent: (event: DosEvent, arg?: unknown) => {
          console.log("js-dos event:", event, arg);
          if (event === "emu-ready") {
            console.log("Emulator is ready");
          } else if (event === "ci-ready") {
            console.log("Command interface is ready");
            setIsLoading(false);
          } else if (event === "exit") {
            console.log("Program terminated:", arg);
            if (containerRef.current) {
              containerRef.current.innerHTML = "";
              handleLoadGame(game);
            }
          }
        },
        onload: () => {
          console.log("Game bundle loaded successfully");
        },
        onerror: (error: Error) => {
          console.error("Failed to load game:", error);
          setIsLoading(false);
        },
      };

      dosPropsRef.current = window.Dos(containerRef.current, options);
      console.log("Dos instance created:", !!dosPropsRef.current);
    } catch (error) {
      console.error("Failed to start DOSBox:", error);
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (containerRef.current) {
      if (dosPropsRef.current) {
        console.log("Stopping dosbox instance before reset...");
        await dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }
      containerRef.current.innerHTML = "";
      setIsGameRunning(false);
      setSelectedGame(null);
    }
    setIsResetDialogOpen(false);
  };

  // TODO: Implement add to desktop functionality
  // const handleAddToDesktop = (game: Game, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   
  //   // Check if shortcut already exists
  //   const desktopItems = fileStore.getItemsInPath("/Desktop");
  //   const existingShortcut = desktopItems.find(
  //     (item) =>
  //       item.aliasType === "app" &&
  //       item.aliasTarget === "games" &&
  //       item.status === "active" &&
  //       item.name === game.name
  //   );

  //   if (existingShortcut) {
  //     toast.info("Desktop shortcut already exists", {
  //       description: `${game.name} is already on the desktop`,
  //     });
  //     return;
  //   }

  //   // Create a file system item for the game shortcut
  //   // We'll create it as a file alias that launches the games app with the game ID
  //   const gamePath = `/Applications/${game.name}`;
  //   fileStore.createAlias(gamePath, game.name, "app", "games");
  //   
  //   // Update the shortcut to include game ID in metadata
  //   const latestDesktopItems = fileStore.getItemsInPath("/Desktop");
  //   const createdShortcut = latestDesktopItems.find(
  //     (item) =>
  //       item.aliasType === "app" &&
  //       item.aliasTarget === "games" &&
  //       item.status === "active" &&
  //       item.name === game.name
  //   );

  //   if (createdShortcut) {
  //     // Store game ID in the shortcut's metadata so we can launch it directly
  //     fileStore.updateItemMetadata(createdShortcut.path, {
  //       appId: "games",
  //       // We'll use a custom property to store the game ID
  //     } as any);
  //     
  //     toast.success("Added to desktop", {
  //       description: `Shortcut for ${game.name} created`,
  //     });
  //   }

  //   setContextMenuPos(null);
  //   setContextMenuGame(null);
  // };

  const handleGameContextMenu = (game: Game, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuGame(game);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPos(null);
      setContextMenuGame(null);
    };
    if (contextMenuPos) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenuPos]);

  const filteredGames = loadGames().filter(
    (game) => filterType === "all" || game.type === filterType
  );

  const menuBar = (
    <GamesMenuBar
      onClose={onClose}
      onShowHelp={() => setIsHelpDialogOpen(true)}
      onShowAbout={() => setIsAboutDialogOpen(true)}
      onReset={() => setIsResetDialogOpen(true)}
      onLoadGame={handleLoadGame}
      selectedGame={selectedGame}
      onSetMouseCapture={handleSetMouseCapture}
      onSetFullScreen={handleSetFullScreen}
      onSetRenderAspect={handleSetRenderAspect}
      onSetMouseSensitivity={handleSetMouseSensitivity}
      isMouseCaptured={isMouseCaptured}
      isFullScreen={isFullScreen}
      currentRenderAspect={currentRenderAspect}
      mouseSensitivity={mouseSensitivity}
    />
  );

  if (!isWindowOpen) return null;

  return (
    <>
      {!isXpTheme && isForeground && menuBar}
      <WindowFrame
        title="Games"
        onClose={onClose}
        isForeground={isForeground}
        appId="games"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
        menuBar={isXpTheme ? menuBar : undefined}
      >
        <div className="flex flex-col h-full w-full bg-[#1a1a1a]">
          <div className="flex-1 relative h-full">
            {/* DOSBox container */}
            <div
              id="dosbox"
              ref={containerRef}
              className={cn("w-full h-full", isGameRunning ? "block" : "hidden")}
              style={{ minHeight: "400px", position: "relative" }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="px-4 py-2 rounded bg-black/50 backdrop-blur-sm">
                  <div className="font-geneva-12 text-sm shimmer text-white">
                    Loading {selectedGame?.name}...
                  </div>
                </div>
              </div>
            )}
            {!isGameRunning && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="bg-black px-4 py-2 border-b border-[#3a3a3a]">
                  <div className="flex items-center justify-between">
                    <div className="font-apple-garamond text-white text-lg">
                      Games
                    </div>
                    <div className="font-geneva-12 text-gray-400 text-[12px] flex items-center gap-2">
                      {isScriptLoaded ? (
                        `${filteredGames.length} games available`
                      ) : (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Loading emulator...
                        </>
                      )}
                    </div>
                  </div>
                </div>


                {/* Game Grid */}
                <div className="flex-1 p-4 overflow-y-auto flex justify-start md:justify-center w-full">
                  <div
                    className={cn(
                      "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-300 w-full",
                      !isScriptLoaded
                        ? "opacity-50 pointer-events-none"
                        : "opacity-100"
                    )}
                  >
                    {filteredGames.map((game) => (
                      <motion.button
                        key={game.id}
                        onClick={() => handleLoadGame(game)}
                        onContextMenu={(e) => handleGameContextMenu(game, e)}
                        className="group relative aspect-video rounded overflow-hidden bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.7)] border border-[#3a3a3a] hover:border-[#4a4a4a] w-full"
                        whileHover={{
                          scale: 1.05,
                          y: -2,
                          transition: {
                            duration: 0.08,
                            ease: "linear",
                          },
                        }}
                        whileTap={{
                          scale: 0.95,
                          y: 0,
                          transition: {
                            type: "spring",
                            duration: 0.15,
                          },
                        }}
                      >
                        <div className="relative w-full h-full">
                          <img
                            src={game.image}
                            alt={game.name}
                            className="w-full h-full object-cover"
                            width={320}
                            height={180}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-3">
                            <span className="text-white font-geneva-12 text-sm font-semibold mb-1">
                              {game.name}
                            </span>
                            {game.description && (
                              <span className="text-gray-300 font-geneva-12 text-[10px]">
                                {game.description}
                              </span>
                            )}
                            {game.year && (
                              <span className="text-gray-400 font-geneva-12 text-[10px] mt-1">
                                {game.year}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Games"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isResetDialogOpen}
          onOpenChange={setIsResetDialogOpen}
          onConfirm={handleReset}
          title="Reset Game"
          description="Are you sure you want to reset the game? This will clear all current state."
        />
      </WindowFrame>
    </>
  );
}

