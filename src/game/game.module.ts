import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GameController } from './game.controller';
import { GameService } from './services/game.service';
import { RedisService } from './services/redis.service';
import { MatchmakingService } from './services/matchmaking.service';
import { GameGateway } from './gateways/game.gateway';
import { Game, GameSchema } from './entities/game.entity';
import { Country, CountrySchema } from './entities/country.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Country.name, schema: CountrySchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '60m' },
    }),
    AuthModule,
  ],
  controllers: [GameController],
  providers: [GameService, RedisService, MatchmakingService, GameGateway],
  exports: [GameService, RedisService, MatchmakingService],
})
export class GameModule {}
