import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Game,
  GameDocument,
  GameRound,
  Player,
  GameStatus,
} from '../entities/game.entity';
import {
  Country,
  CountryDocument,
  CountryLegacy,
} from '../entities/country.entity';
import { RedisService } from './redis.service';
import { PlayerStatsService } from '../../auth/player-stats.service';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    private redisService: RedisService,
    private playerStatsService: PlayerStatsService,
  ) {}

  async createGame(player1: any, player2: any): Promise<GameDocument> {
    const gameId = this.generateGameId();

    const players: Player[] = [
      {
        userId: player1.userId,
        username: player1.username,
        socketId: player1.socketId,
        score: 0,
        answers: [],
      },
      {
        userId: player2.userId,
        username: player2.username,
        socketId: player2.socketId,
        score: 0,
        answers: [],
      },
    ];

    const rounds = await this.generateGameRounds(10);

    const game = new this.gameModel({
      gameId,
      players,
      rounds,
      currentRound: 0,
      status: GameStatus.IN_PROGRESS,
      startTime: new Date(),
      maxRounds: 10,
      roundTimeLimit: 15,
    });

    const savedGame = await game.save();

    // Store in Redis for quick access
    await this.redisService.setGameState(gameId, savedGame.toObject());

    return savedGame;
  }

  async getGame(gameId: string): Promise<GameDocument | null> {
    // Try Redis first
    const gameState = await this.redisService.getGameState(gameId);
    if (gameState) {
      return gameState;
    }

    // Fallback to MongoDB
    return await this.gameModel.findOne({ gameId }).exec();
  }

  async submitAnswer(
    gameId: string,
    userId: string,
    selectedOption: string,
    timeToAnswer: number,
  ): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const currentRound = game.rounds[game.currentRound];
    const isCorrect = selectedOption === currentRound.correctAnswer;

    // Find player and update their answer
    const player = game.players.find((p) => p.userId === userId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Check if player already answered this round
    const existingAnswer = player.answers.find(
      (a) => a.roundNumber === game.currentRound,
    );
    if (existingAnswer) {
      return false; // Already answered
    }

    // Add answer
    player.answers.push({
      roundNumber: game.currentRound,
      selectedOption,
      isCorrect,
      timeToAnswer,
    });

    // Update score
    if (isCorrect) {
      const timeBonus = Math.max(0, currentRound.timeLimit - timeToAnswer);
      player.score += 100 + timeBonus;
    }

    // Award XP and currency to player
    try {
      await this.playerStatsService.awardXp(userId, isCorrect, timeToAnswer);
    } catch (error) {
      console.error('Error awarding XP:', error);
      // Continue with game flow even if XP award fails
    }

    // Update game state
    await this.updateGameState(game);

    return true;
  }

  async checkRoundComplete(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return false;

    const currentRoundAnswers = game.players.filter((p) =>
      p.answers.some((a) => a.roundNumber === game.currentRound),
    );

    return currentRoundAnswers.length === game.players.length;
  }

  async advanceToNextRound(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return false;

    game.currentRound++;

    if (game.currentRound >= game.maxRounds) {
      game.status = GameStatus.FINISHED;
      game.endTime = new Date();
    }

    await this.updateGameState(game);

    return game.currentRound < game.maxRounds;
  }

  async getGameResults(gameId: string): Promise<any> {
    const game = await this.getGame(gameId);
    if (!game) return null;

    const results = game.players.map((player) => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      correctAnswers: player.answers.filter((a) => a.isCorrect).length,
      totalAnswers: player.answers.length,
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return {
      gameId: game.gameId,
      results,
      totalRounds: game.maxRounds,
      completedRounds: game.currentRound,
    };
  }

  async cleanupGame(gameId: string): Promise<void> {
    await this.redisService.deleteGameState(gameId);
    // Optionally keep the game in MongoDB for history
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateGameRounds(count: number): Promise<GameRound[]> {
    // Get all active countries from database
    const countries = await this.countryModel.find({ isActive: true });

    if (countries.length < count + 3) {
      throw new Error(
        'Not enough countries in database to generate game rounds',
      );
    }

    const rounds: GameRound[] = [];
    const usedCountries = new Set<string>();

    for (let i = 0; i < count; i++) {
      let country: Country;

      // Ensure no duplicate countries
      do {
        country = countries[Math.floor(Math.random() * countries.length)];
      } while (usedCountries.has(country.cca2));

      usedCountries.add(country.cca2);

      // Generate 3 random wrong options
      const wrongOptions: string[] = [];
      while (wrongOptions.length < 3) {
        const randomCountry =
          countries[Math.floor(Math.random() * countries.length)];
        if (
          randomCountry.cca2 !== country.cca2 &&
          !wrongOptions.includes(randomCountry.name)
        ) {
          wrongOptions.push(randomCountry.name);
        }
      }

      // Create options array and shuffle
      const options = [country.name, ...wrongOptions];
      this.shuffleArray(options);

      rounds.push({
        roundNumber: i,
        flag: country.flagUrl, // Use flag image URL instead of emoji
        country: country.name,
        options,
        correctAnswer: country.name,
        timeLimit: 15,
      });
    }

    return rounds;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private async updateGameState(game: any): Promise<void> {
    // Update Redis
    await this.redisService.setGameState(game.gameId, game);

    // Update MongoDB
    await this.gameModel.updateOne({ gameId: game.gameId }, game, {
      upsert: true,
    });
  }
}
