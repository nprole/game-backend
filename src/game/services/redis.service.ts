import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;
  private mockMode = false;
  private mockData = {
    queue: [] as any[],
    gameStates: new Map<string, any>(),
    sessions: new Map<string, any>(),
  };

  async onModuleInit() {
    try {
      // Create Redis clients
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.subscriber = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.publisher = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      // Connect clients
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();

      console.log('Redis clients connected');
    } catch (error: any) {
      console.warn(
        'Redis connection failed, switching to mock mode:',
        error.message,
      );
      this.mockMode = true;
    }
  }

  async onModuleDestroy() {
    if (!this.mockMode) {
      await this.client.disconnect();
      await this.subscriber.disconnect();
      await this.publisher.disconnect();
    }
  }

  // Queue management
  async addToQueue(
    userId: string,
    username: string,
    socketId: string,
  ): Promise<void> {
    const playerData = {
      userId,
      username,
      socketId,
      timestamp: Date.now(),
    };

    if (this.mockMode) {
      this.mockData.queue.push(playerData);
      return;
    }

    await this.client.rPush(
      'game:matchmaking:queue',
      JSON.stringify(playerData),
    );
  }

  async removeFromQueue(userId: string): Promise<void> {
    if (this.mockMode) {
      this.mockData.queue = this.mockData.queue.filter(
        (p) => p.userId !== userId,
      );
      return;
    }

    const queue = await this.client.lRange('game:matchmaking:queue', 0, -1);
    for (let i = 0; i < queue.length; i++) {
      const playerData = JSON.parse(queue[i]);
      if (playerData.userId === userId) {
        await this.client.lRem('game:matchmaking:queue', 1, queue[i]);
        break;
      }
    }
  }

  async getQueueSize(): Promise<number> {
    if (this.mockMode) {
      return this.mockData.queue.length;
    }
    return await this.client.lLen('game:matchmaking:queue');
  }

  async getNextPlayersFromQueue(count: number): Promise<any[]> {
    if (this.mockMode) {
      const players = this.mockData.queue.splice(0, count);
      return players;
    }

    const players: any[] = [];
    for (let i = 0; i < count; i++) {
      const playerData = await this.client.lPop('game:matchmaking:queue');
      if (playerData) {
        players.push(JSON.parse(playerData));
      }
    }
    return players;
  }

  // Game state management
  async setGameState(gameId: string, gameState: any): Promise<void> {
    if (this.mockMode) {
      this.mockData.gameStates.set(gameId, gameState);
      return;
    }

    await this.client.setEx(
      `game:state:${gameId}`,
      3600,
      JSON.stringify(gameState),
    );
  }

  async getGameState(gameId: string): Promise<any> {
    if (this.mockMode) {
      return this.mockData.gameStates.get(gameId) || null;
    }

    const gameState = await this.client.get(`game:state:${gameId}`);
    return gameState ? JSON.parse(gameState) : null;
  }

  async deleteGameState(gameId: string): Promise<void> {
    if (this.mockMode) {
      this.mockData.gameStates.delete(gameId);
      return;
    }

    await this.client.del(`game:state:${gameId}`);
  }

  // Player session management
  async setPlayerSession(userId: string, sessionData: any): Promise<void> {
    if (this.mockMode) {
      this.mockData.sessions.set(userId, sessionData);
      return;
    }

    await this.client.setEx(
      `player:session:${userId}`,
      3600,
      JSON.stringify(sessionData),
    );
  }

  async getPlayerSession(userId: string): Promise<any> {
    if (this.mockMode) {
      return this.mockData.sessions.get(userId) || null;
    }

    const sessionData = await this.client.get(`player:session:${userId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  async deletePlayerSession(userId: string): Promise<void> {
    if (this.mockMode) {
      this.mockData.sessions.delete(userId);
      return;
    }

    await this.client.del(`player:session:${userId}`);
  }

  // Pub/Sub for game events
  async publishGameEvent(channel: string, data: any): Promise<void> {
    if (this.mockMode) {
      console.log(`Mock publish to ${channel}:`, data);
      return;
    }

    await this.publisher.publish(channel, JSON.stringify(data));
  }

  async subscribeToGameEvents(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    if (this.mockMode) {
      console.log(`Mock subscribe to ${channel}`);
      return;
    }

    await this.subscriber.subscribe(channel, (message) => {
      callback(JSON.parse(message));
    });
  }
}
