import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PlayerStatsService, PlayerStats } from './player-stats.service';
import { UserService } from './user.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  experience: number;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly playerStatsService: PlayerStatsService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() user: Partial<User>) {
    return this.authService.register(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getPlayerStats(@Request() req): Promise<PlayerStats> {
    console.log('User from JWT:', req.user);
    console.log('User ID being used:', req.user.userId);
    return this.playerStatsService.getPlayerStats(req.user.userId);
  }

  @Get('leaderboard')
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const users = await this.userService.getLeaderboard(50);
    return users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      level: user.level,
      experience: user.xp,
    }));
  }
}
