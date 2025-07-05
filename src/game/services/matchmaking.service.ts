import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { GameService } from './game.service';

@Injectable()
export class MatchmakingService {
  constructor(
    private redisService: RedisService,
    private gameService: GameService,
  ) {}

  async addPlayerToQueue(
    userId: string,
    username: string,
    socketId: string,
  ): Promise<void> {
    await this.redisService.addToQueue(userId, username, socketId);
  }

  async removePlayerFromQueue(userId: string): Promise<void> {
    await this.redisService.removeFromQueue(userId);
  }

  async getQueueSize(): Promise<number> {
    return await this.redisService.getQueueSize();
  }

  async tryMatchPlayers(): Promise<string | null> {
    const queueSize = await this.redisService.getQueueSize();

    if (queueSize >= 2) {
      const players = await this.redisService.getNextPlayersFromQueue(2);

      if (players.length === 2) {
        const game = await this.gameService.createGame(players[0], players[1]);
        return game.gameId;
      }
    }

    return null;
  }

  getPlayerPosition(userId: string): number {
    // For now, return a simple position
    // This would need to be implemented in RedisService as a public method
    console.log(`Getting position for user: ${userId}`);
    return -1; // Not in queue
  }
}
