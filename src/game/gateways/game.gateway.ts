import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../services/game.service';
import { RedisService } from '../services/redis.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedPlayers = new Map<
    string,
    { userId: string; username: string; socketId: string }
  >();

  constructor(
    private gameService: GameService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);

      const playerData = {
        userId: payload.sub,
        username: payload.username,
        socketId: client.id,
      };

      this.connectedPlayers.set(client.id, playerData);

      client.emit('connected', { message: 'Connected to game server' });
      console.log(`Player ${payload.username} connected: ${client.id}`);
    } catch {
      console.log('Unauthorized connection attempt');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const playerData = this.connectedPlayers.get(client.id);
    if (playerData) {
      await this.redisService.removeFromQueue(playerData.userId);
      this.connectedPlayers.delete(client.id);
      console.log(`Player ${playerData.username} disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(@ConnectedSocket() client: Socket) {
    const playerData = this.connectedPlayers.get(client.id);
    if (!playerData) {
      client.emit('error', { message: 'Player not authenticated' });
      return;
    }

    try {
      await this.redisService.addToQueue(
        playerData.userId,
        playerData.username,
        playerData.socketId,
      );
      client.emit('queueJoined', { message: 'Looking for opponent...' });

      // Check if we can start a match
      const queueSize = await this.redisService.getQueueSize();
      if (queueSize >= 2) {
        await this.startMatch();
      }
    } catch {
      client.emit('error', { message: 'Failed to join queue' });
    }
  }

  @SubscribeMessage('leaveQueue')
  async handleLeaveQueue(@ConnectedSocket() client: Socket) {
    const playerData = this.connectedPlayers.get(client.id);
    if (!playerData) {
      return;
    }

    try {
      await this.redisService.removeFromQueue(playerData.userId);
      client.emit('queueLeft', { message: 'Left the queue' });
    } catch {
      client.emit('error', { message: 'Failed to leave queue' });
    }
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { gameId: string; selectedOption: string; timeToAnswer: number },
  ) {
    const playerData = this.connectedPlayers.get(client.id);
    if (!playerData) {
      client.emit('error', { message: 'Player not authenticated' });
      return;
    }

    try {
      const success = await this.gameService.submitAnswer(
        data.gameId,
        playerData.userId,
        data.selectedOption,
        data.timeToAnswer,
      );

      if (success) {
        client.emit('answerSubmitted', { message: 'Answer recorded' });

        // Check if round is complete
        const isRoundComplete = await this.gameService.checkRoundComplete(
          data.gameId,
        );
        if (isRoundComplete) {
          await this.handleRoundComplete(data.gameId);
        }
      } else {
        client.emit('error', { message: 'Failed to submit answer' });
      }
    } catch (error: any) {
      client.emit('error', { message: error.message || 'An error occurred' });
    }
  }

  private async startMatch() {
    try {
      const players = await this.redisService.getNextPlayersFromQueue(2);
      if (players.length < 2) {
        return;
      }

      const game = await this.gameService.createGame(players[0], players[1]);

      // Notify both players
      const gameData = {
        gameId: game.gameId,
        players: game.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
        })),
        currentRound: game.currentRound,
        round: game.rounds[game.currentRound],
      };

      players.forEach((player) => {
        this.server.to(player.socketId).emit('gameStarted', gameData);
      });

      console.log(`Game started: ${game.gameId}`);
    } catch (error) {
      console.error('Failed to start match:', error);
    }
  }

  private async handleRoundComplete(gameId: string) {
    try {
      const hasNextRound = await this.gameService.advanceToNextRound(gameId);

      if (hasNextRound) {
        // Start next round
        const game = await this.gameService.getGame(gameId);
        if (!game) return;

        const roundData = {
          gameId: game.gameId,
          currentRound: game.currentRound,
          round: game.rounds[game.currentRound],
          players: game.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            score: p.score,
          })),
        };

        game.players.forEach((player) => {
          this.server.to(player.socketId).emit('nextRound', roundData);
        });
      } else {
        // Game finished
        const results = await this.gameService.getGameResults(gameId);
        const game = await this.gameService.getGame(gameId);
        if (!game) return;

        game.players.forEach((player) => {
          this.server.to(player.socketId).emit('gameFinished', results);
        });

        // Cleanup
        await this.gameService.cleanupGame(gameId);
      }
    } catch (error) {
      console.error('Failed to handle round completion:', error);
    }
  }
}
