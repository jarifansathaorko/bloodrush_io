// ============================================================
// BloodRush.io — App Entry Point
// ============================================================
import { GameManager } from "./core/game.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }

  const game = new GameManager(canvas);
  window.game = game; // expose for debugging
  await game.init();

  // Browsers block autoplay until the user interacts with the page.
  // This listener starts the music on the very first click/keypress.
  const startAudioOnInteract = () => {
    if (game.audio && game.audio.musicEnabled) {
      game.audio.startMusic();
    }
    window.removeEventListener("click", startAudioOnInteract);
    window.removeEventListener("keydown", startAudioOnInteract);
    window.removeEventListener("touchstart", startAudioOnInteract);
  };
  
  window.addEventListener("click", startAudioOnInteract);
  window.addEventListener("keydown", startAudioOnInteract);
  window.addEventListener("touchstart", startAudioOnInteract);
});
