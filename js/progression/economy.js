// ============================================================
// BloodRush.io — Economy Manager
// ============================================================
import { CONFIG } from "../config.js";

export class EconomyManager {
  constructor(saveManager) {
    this.save = saveManager;
  }

  computeMatchRewards({ kills, finalRank, finalSize, totalPlayers, survived }) {
    const eco = CONFIG.ECONOMY;
    let coins = Math.floor(
      kills * eco.COIN_PER_KILL + finalSize * eco.COIN_PER_SIZE,
    );
    let xp = eco.XP_PER_MATCH;
    xp += kills * eco.XP_PER_KILL;
    xp += Math.max(0, totalPlayers - finalRank + 1) * eco.XP_PER_RANK;
    if (survived) {
      coins = Math.floor(coins * 1.5);
      xp = Math.floor(xp * 1.5);
    }

    const score = Math.floor(
      finalSize * 10 + kills * 50 + (survived ? 500 : 0),
    );

    return { coins, xp, score, gems: 0 };
  }

  applyMatchRewards(rewards) {
    this.save.addCoins(rewards.coins);
    this.save.addXP(rewards.xp);
    if (rewards.gems) this.save.addGems(rewards.gems);
    return rewards;
  }

  purchaseSkin(skinId) {
    const skin = CONFIG.getSkin ? CONFIG.getSkin(skinId) : CONFIG.SKINS.find((s) => s.id === skinId);
    if (!skin || skin.unlocked) return false;
    const data = this.save.data;
    if (data.coins < skin.cost) return false;
    this.save.addCoins(-skin.cost);
    this.save.unlockSkin(skinId);
    return true;
  }

  getDailyRewardAmount() {
    const level = this.save.get("level") || 1;
    const eco   = CONFIG.ECONOMY;
    // Scale reward 30..75 by level, hard-capped at DAILY_REWARD_MAX
    const base  = eco.DAILY_REWARD_MIN + (level - 1) * 3;
    return Math.min(eco.DAILY_REWARD_MAX, base);
  }

  canClaimDailyReward() {
    const lastClaim = this.save.get("lastDailyRewardClaimed") || 0;
    const now = Date.now();
    // 24 hours in milliseconds
    return (now - lastClaim) >= (24 * 60 * 60 * 1000);
  }

  getDailyRewardTimeLeft() {
    const lastClaim = this.save.get("lastDailyRewardClaimed") || 0;
    const now = Date.now();
    const nextTime = lastClaim + (24 * 60 * 60 * 1000);
    return Math.max(0, nextTime - now);
  }

  claimDailyReward() {
    if (!this.canClaimDailyReward()) return false;
    
    const amount = this.getDailyRewardAmount();
    this.save.addCoins(amount);
    this.save.set("lastDailyRewardClaimed", Date.now());
    return amount;
  }
}

export default EconomyManager;
