import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { GameService } from './services/game.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('history')
  async getGameHistory(@Request() req) {
    // This would typically get games from the database for this user
    // For now, return empty array
    return {
      games: [],
      totalGames: 0,
    };
  }

  @Get('stats')
  async getGameStats(@Request() req) {
    // Return user's game statistics
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      averageScore: 0,
      bestScore: 0,
    };
  }

  @Get(':gameId')
  async getGameDetails(@Param('gameId') gameId: string) {
    const game = await this.gameService.getGame(gameId);
    if (!game) {
      return { error: 'Game not found' };
    }
    return game;
  }
}
