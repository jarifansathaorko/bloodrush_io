// ============================================================
// BloodRush.io — CrazyGames SDK Integration
// ============================================================

class CrazyGamesSDKStub {
  constructor() {
    this.isReady = false;
  }

  async init() {
    if (window.CrazyGames && window.CrazyGames.SDK) {
      console.log("[CrazyGames] Real SDK detected.");
      this.isReady = true;
      return Promise.resolve();
    }
    console.log("[CrazyGames] SDK stub initialized (Basic Launch mode)");
    this.isReady = true;
    return Promise.resolve();
  }

  gameplayStart() {
    if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.game) {
      window.CrazyGames.SDK.game.gameplayStart();
    } else {
      console.log("[CrazyGames] gameplayStart event");
    }
  }

  gameplayStop() {
    if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.game) {
      window.CrazyGames.SDK.game.gameplayStop();
    } else {
      console.log("[CrazyGames] gameplayStop event");
    }
  }

  loadingStart() {
    console.log("[CrazyGames] loadingStart event");
  }

  loadingStop() {
    console.log("[CrazyGames] loadingStop event");
  }

  requestMidgameAd() {
    return new Promise((resolve) => {
      if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
        window.CrazyGames.SDK.ad.requestAd("midgame", {
          adStarted: () => console.log("[CrazyGames] Midgame ad started"),
          adFinished: () => resolve("adFinished"),
          adError: () => resolve("adError"),
        });
      } else {
        console.log("[CrazyGames] midgame ad requested (stub)");
        resolve("adError");
      }
    });
  }

  requestRewardedAd(callbacks) {
    if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
      window.CrazyGames.SDK.ad.requestAd("rewarded", callbacks);
    } else {
      console.log("[CrazyGames] rewarded ad requested (stub)");
      // Mock ad behavior for testing when SDK is not present
      if (callbacks.adStarted) callbacks.adStarted();
      
      // Simulate ad delay
      setTimeout(() => {
        // We can simulate success or error. For testing purposes we simulate success.
        // Change to adError() to test failure.
        if (callbacks.adFinished) callbacks.adFinished();
      }, 2000);
    }
  }

  async getUser() {
    return null;
  }

  async getUserToken() {
    return null;
  }

  async getLeaderboard(leaderboardName = "global-highscores", options = { count: 10 }) {
    if (window.CrazyGames && window.CrazyGames.SDK) {
      try {
        if (window.CrazyGames.SDK.data && window.CrazyGames.SDK.data.getLeaderboard) {
          const res = await window.CrazyGames.SDK.data.getLeaderboard(leaderboardName, options);
          if (res && res.entries && res.entries.length) {
            return res.entries.map((e) => ({
              name: e.displayName || e.username || "Player",
              score: e.score || 0,
            }));
          }
        }
      } catch (err) {
        console.warn("[CrazyGames] Leaderboard fetch fallback:", err);
      }
    }
    return null;
  }

  async submitScore(score, leaderboardName = "global-highscores") {
    if (window.CrazyGames && window.CrazyGames.SDK) {
      try {
        if (window.CrazyGames.SDK.data && window.CrazyGames.SDK.data.submitScore) {
          await window.CrazyGames.SDK.data.submitScore(leaderboardName, score);
          console.log(`[CrazyGames] Submitted score ${score} to ${leaderboardName}`);
          return true;
        }
      } catch (err) {
        console.warn("[CrazyGames] Leaderboard submit fallback:", err);
      }
    }
    return false;
  }
}

// Singleton
export const CrazyGames = new CrazyGamesSDKStub();
export default CrazyGames;
