import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';

export interface PlayerStats {
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  rubies: number;
}

export interface XpReward {
  xpGained: number;
  goldEarned: number;
  leveledUp: boolean;
  newLevel?: number;
}

@Injectable()
export class PlayerStatsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Calculate XP required for a specific level
  getXpForLevel(level: number): number {
    if (level <= 10) {
      return 100 + level * 20;
    }
    return Math.floor(150 + Math.pow(level, 1.5));
  }

  // Get total XP needed to reach a specific level
  getTotalXpForLevel(level: number): number {
    let totalXp = 0;
    for (let i = 1; i < level; i++) {
      totalXp += this.getXpForLevel(i);
    }
    return totalXp;
  }

  // Calculate XP percentage for current level
  getXpPercentage(currentXp: number, level: number): number {
    const xpNeededForCurrentLevel = this.getXpForLevel(level);
    return Math.min(100, (currentXp / xpNeededForCurrentLevel) * 100);
  }

  // Award XP and handle level-ups
  async awardXp(userId: string, correct: boolean, timeToAnswer?: number, streak?: number): Promise<XpReward> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure user has all the new fields (for existing users)
    if (user.level === undefined || user.xp === undefined || user.gold === undefined || user.diamonds === undefined || user.rubies === undefined) {
      user.level = user.level || 1;
      user.xp = user.xp || 0;
      user.gold = user.gold || 500;
      user.diamonds = user.diamonds || 50;
      user.rubies = user.rubies || 10;
    }

    // Base XP calculation
    let xpGained = correct ? 50 : 10;
    let goldEarned = 0;
    let leveledUp = false;
    let newLevel = user.level;

    // Bonus XP for speed (if answered in under 5 seconds)
    if (correct && timeToAnswer && timeToAnswer < 5) {
      xpGained += 15;
    }

    // Streak bonus
    if (streak && streak > 1) {
      xpGained += Math.min(streak * 5, 50); // Max 50 bonus XP for streaks
    }

    // Update user XP
    user.xp += xpGained;

    // Check for level-ups
    while (user.xp >= this.getXpForLevel(user.level) && user.level < 100) {
      user.xp -= this.getXpForLevel(user.level);
      user.level += 1;
      leveledUp = true;
      newLevel = user.level;
      
      // Level-up rewards
      goldEarned += 100;
      user.gold += 100;
      
      // Special rewards for milestone levels
      if (user.level % 10 === 0) {
        user.diamonds += 5;
        user.rubies += 1;
      }
    }

    // Gold reward for correct answers
    if (correct) {
      const goldReward = Math.floor(Math.random() * 20) + 10; // 10-30 gold
      user.gold += goldReward;
      goldEarned += goldReward;
    }

    await user.save();

    return {
      xpGained,
      goldEarned,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  // Get player stats
  async getPlayerStats(userId: string): Promise<PlayerStats> {
    console.log('Looking for user with ID:', userId);
    const user = await this.userModel.findById(userId);
    console.log('Found user:', user ? 'Yes' : 'No');
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure user has all the new fields (for existing users)
    if (user.level === undefined || user.xp === undefined || user.gold === undefined || user.diamonds === undefined || user.rubies === undefined) {
      user.level = user.level || 1;
      user.xp = user.xp || 0;
      user.gold = user.gold || 500;
      user.diamonds = user.diamonds || 50;
      user.rubies = user.rubies || 10;
      await user.save();
    }

    return {
      level: user.level,
      xp: user.xp,
      gold: user.gold,
      diamonds: user.diamonds,
      rubies: user.rubies,
    };
  }

  // Spend currency
  async spendCurrency(userId: string, gold: number = 0, diamonds: number = 0, rubies: number = 0): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure user has all the new fields (for existing users)
    if (user.level === undefined || user.xp === undefined || user.gold === undefined || user.diamonds === undefined || user.rubies === undefined) {
      user.level = user.level || 1;
      user.xp = user.xp || 0;
      user.gold = user.gold || 500;
      user.diamonds = user.diamonds || 50;
      user.rubies = user.rubies || 10;
    }

    // Check if user has enough currency
    if (user.gold < gold || user.diamonds < diamonds || user.rubies < rubies) {
      return false;
    }

    // Deduct currency
    user.gold -= gold;
    user.diamonds -= diamonds;
    user.rubies -= rubies;

    await user.save();
    return true;
  }

  // Award currency (for future features like daily rewards)
  async awardCurrency(userId: string, gold: number = 0, diamonds: number = 0, rubies: number = 0): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure user has all the new fields (for existing users)
    if (user.level === undefined || user.xp === undefined || user.gold === undefined || user.diamonds === undefined || user.rubies === undefined) {
      user.level = user.level || 1;
      user.xp = user.xp || 0;
      user.gold = user.gold || 500;
      user.diamonds = user.diamonds || 50;
      user.rubies = user.rubies || 10;
    }

    user.gold += gold;
    user.diamonds += diamonds;
    user.rubies += rubies;

    await user.save();
  }
} 