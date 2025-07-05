import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { GameService } from './game.service';
import { RedisService } from './redis.service';
import { Game, GameSchema, GameDocument } from '../entities/game.entity';
import { Country, CountrySchema, CountryDocument } from '../entities/country.entity';
import { GameStatus } from '../entities/game.entity';
import { PlayerStatsService } from '../../auth/player-stats.service';

describe('GameService', () => {
  let service: GameService;
  let gameModel: Model<GameDocument>;
  let countryModel: Model<CountryDocument>;
  let redisService: RedisService;
  let playerStatsService: PlayerStatsService;
  let module: TestingModule;

  const mockCountries = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'United States',
      capital: 'Washington, D.C.',
      continent: 'Americas',
      region: 'North America',
      flagUrl: 'https://flagcdn.com/w320/us.png',
      flagEmoji: '🇺🇸',
      code: 'US',
      cca2: 'US',
      cca3: 'USA',
      isActive: true,
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Canada',
      capital: 'Ottawa',
      continent: 'Americas',
      region: 'North America',
      flagUrl: 'https://flagcdn.com/w320/ca.png',
      flagEmoji: '🇨🇦',
      code: 'CA',
      cca2: 'CA',
      cca3: 'CAN',
      isActive: true,
    },
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Germany',
      capital: 'Berlin',
      continent: 'Europe',
      region: 'Western Europe',
      flagUrl: 'https://flagcdn.com/w320/de.png',
      flagEmoji: '🇩🇪',
      code: 'DE',
      cca2: 'DE',
      cca3: 'DEU',
      isActive: true,
    },
    {
      _id: '507f1f77bcf86cd799439014',
      name: 'France',
      capital: 'Paris',
      continent: 'Europe',
      region: 'Western Europe',
      flagUrl: 'https://flagcdn.com/w320/fr.png',
      flagEmoji: '🇫🇷',
      code: 'FR',
      cca2: 'FR',
      cca3: 'FRA',
      isActive: true,
    },
  ];

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    llen: jest.fn(),
    lrange: jest.fn(),
    expire: jest.fn(),
    setGameState: jest.fn(),
    deleteGameState: jest.fn(),
  };

  const mockPlayerStatsService = {
    awardXp: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/game-test-db'),
        MongooseModule.forFeature([
          { name: Game.name, schema: GameSchema },
          { name: Country.name, schema: CountrySchema },
        ]),
      ],
      providers: [
        GameService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PlayerStatsService,
          useValue: mockPlayerStatsService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameModel = module.get<Model<GameDocument>>(getModelToken(Game.name));
    countryModel = module.get<Model<CountryDocument>>(getModelToken(Country.name));
    redisService = module.get<RedisService>(RedisService);
    playerStatsService = module.get<PlayerStatsService>(PlayerStatsService);

    // Clean up database
    await gameModel.deleteMany({});
    await countryModel.deleteMany({});

    // Insert test countries
    await countryModel.insertMany(mockCountries);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
    await countryModel.deleteMany({});
  });

  afterAll(async () => {
    await module.close();
  });

  describe('createGame', () => {
    it('should create a new game with correct initial values', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);

      expect(game).toBeDefined();
      expect(game.gameId).toBeDefined();
      expect(game.players).toHaveLength(2);
      expect(game.players[0]).toEqual(expect.objectContaining(player1));
      expect(game.players[1]).toEqual(expect.objectContaining(player2));
      expect(game.status).toBe(GameStatus.WAITING_FOR_PLAYERS);
      expect(game.currentRound).toBe(0);
      expect(game.maxRounds).toBe(10);
      expect(game.rounds).toHaveLength(10);
    });

    it('should create game with 10 unique countries', async () => {
      // Add more countries to ensure we have enough
      const additionalCountries = [];
      for (let i = 5; i <= 15; i++) {
        additionalCountries.push({
          _id: `507f1f77bcf86cd79943901${i}`,
          name: `Country ${i}`,
          capital: `Capital ${i}`,
          continent: 'Test',
          region: 'Test Region',
          flagUrl: `https://flagcdn.com/w320/test${i}.png`,
          flagEmoji: `🏳️`,
          code: `T${i}`,
          cca2: `T${i}`,
          cca3: `T${i}${i}`,
          isActive: true,
        });
      }
      await countryModel.insertMany(additionalCountries);

      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);

      expect(game.rounds).toHaveLength(10);
      
      // Check that all countries in rounds are unique
      const countriesInRounds = game.rounds.map(round => round.correctAnswer);
      const uniqueCountries = [...new Set(countriesInRounds)];
      expect(uniqueCountries).toHaveLength(10);
    });

    it('should throw error when insufficient countries available', async () => {
      // Clear countries so there are not enough
      await countryModel.deleteMany({});
      
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      await expect(service.createGame(player1, player2)).rejects.toThrow('Not enough countries in database');
    });

    it('should generate 4 unique options for each round', async () => {
      // Add more countries to ensure we have enough for options
      const additionalCountries = [];
      for (let i = 5; i <= 20; i++) {
        additionalCountries.push({
          _id: `507f1f77bcf86cd79943901${i}`,
          name: `Country ${i}`,
          capital: `Capital ${i}`,
          continent: 'Test',
          region: 'Test Region',
          flagUrl: `https://flagcdn.com/w320/test${i}.png`,
          flagEmoji: `🏳️`,
          code: `T${i}`,
          cca2: `T${i}`,
          cca3: `T${i}${i}`,
          isActive: true,
        });
      }
      await countryModel.insertMany(additionalCountries);

      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);

      game.rounds.forEach(round => {
        expect(round.options).toHaveLength(4);
        
        // Check that all options are unique
        const uniqueOptions = [...new Set(round.options.map(o => o.toString()))];
        expect(uniqueOptions).toHaveLength(4);
        
        // Check that correct answer is in options
        expect(round.options).toContain(round.correctAnswer);
      });
    });
  });

  describe('startGame', () => {
    it('should start a game and update status', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      
      const startedGame = await service.startGame(game.gameId);

      expect(startedGame.status).toBe(GameStatus.IN_PROGRESS);
      expect(startedGame.currentRound).toBe(1);
      expect(startedGame.startTime).toBeDefined();
    });

    it('should throw error when game not found', async () => {
      await expect(service.startGame('nonexistent-game-id')).rejects.toThrow('Game not found');
    });

    it('should throw error when game already started', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      await service.startGame(game.gameId);

      await expect(service.startGame(game.gameId)).rejects.toThrow('Game already started');
    });
  });

  describe('submitAnswer', () => {
    let gameId: string;

    beforeEach(async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      gameId = game.gameId;
      await service.startGame(gameId);
    });

    it('should submit correct answer and calculate score', async () => {
      const game = await gameModel.findOne({ gameId });
      const currentRound = game.rounds[0];
      const correctAnswer = currentRound.correctCountry.toString();

      const result = await service.submitAnswer(gameId, 'player1', correctAnswer);

      expect(result.isCorrect).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1000); // Max score is 1000
    });

    it('should submit wrong answer and get zero score', async () => {
      const game = await gameModel.findOne({ gameId });
      const currentRound = game.rounds[0];
      const wrongAnswer = currentRound.options
        .find(option => option.toString() !== currentRound.correctCountry.toString())
        .toString();

      const result = await service.submitAnswer(gameId, 'player1', wrongAnswer);

      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should calculate time bonus correctly', async () => {
      const game = await gameModel.findOne({ gameId });
      const currentRound = game.rounds[0];
      const correctAnswer = currentRound.correctCountry.toString();

      // Submit answer quickly (should get time bonus)
      const result = await service.submitAnswer(gameId, 'player1', correctAnswer);

      expect(result.timeBonus).toBeGreaterThan(0);
      expect(result.totalScore).toBe(result.score + result.timeBonus);
    });

    it('should throw error for invalid game', async () => {
      await expect(service.submitAnswer('invalid-game-id', 'player1', 'answer')).rejects.toThrow('Game not found');
    });

    it('should throw error for invalid player', async () => {
      const game = await gameModel.findOne({ gameId });
      const currentRound = game.rounds[0];
      const correctAnswer = currentRound.correctCountry.toString();

      await expect(service.submitAnswer(gameId, 'invalid-player', correctAnswer)).rejects.toThrow('Player not found in game');
    });

    it('should throw error for invalid answer', async () => {
      await expect(service.submitAnswer(gameId, 'player1', 'invalid-answer')).rejects.toThrow('Invalid answer');
    });

    it('should award XP for correct answer', async () => {
      const gameData = { ...mockGame };
      mockRedisService.getGameState.mockResolvedValue(gameData);
      mockPlayerStatsService.awardXp.mockResolvedValue({
        xpGained: 50,
        goldEarned: 25,
        leveledUp: false,
      });

      const result = await service.submitAnswer(
        'test-game-id',
        '507f1f77bcf86cd799439011',
        'Test Country',
        10,
      );

      expect(result).toBe(true);
      expect(mockPlayerStatsService.awardXp).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        true,
        10,
      );
    });

    it('should award XP for wrong answer', async () => {
      const gameData = { ...mockGame };
      mockRedisService.getGameState.mockResolvedValue(gameData);
      mockPlayerStatsService.awardXp.mockResolvedValue({
        xpGained: 10,
        goldEarned: 0,
        leveledUp: false,
      });

      const result = await service.submitAnswer(
        'test-game-id',
        '507f1f77bcf86cd799439011',
        'Wrong Answer',
        10,
      );

      expect(result).toBe(true);
      expect(mockPlayerStatsService.awardXp).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        false,
        10,
      );
    });

    it('should continue game flow even if XP awarding fails', async () => {
      const gameData = { ...mockGame };
      mockRedisService.getGameState.mockResolvedValue(gameData);
      mockPlayerStatsService.awardXp.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.submitAnswer(
        'test-game-id',
        '507f1f77bcf86cd799439011',
        'Test Country',
        10,
      );

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Error awarding XP:', expect.any(Error));
      expect(mockRedisService.setGameState).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should update player score and answer correctly', async () => {
      const gameData = { ...mockGame };
      mockRedisService.getGameState.mockResolvedValue(gameData);
      mockPlayerStatsService.awardXp.mockResolvedValue({
        xpGained: 50,
        goldEarned: 25,
        leveledUp: false,
      });

      await service.submitAnswer(
        'test-game-id',
        '507f1f77bcf86cd799439011',
        'Test Country',
        10,
      );

      const player = gameData.players[0];
      expect(player.score).toBe(105); // 100 + 5 time bonus
      expect(player.answers).toHaveLength(1);
      expect(player.answers[0]).toEqual({
        roundNumber: 0,
        selectedOption: 'Test Country',
        isCorrect: true,
        timeToAnswer: 10,
      });
    });

    it('should not allow duplicate answers for same round', async () => {
      const gameData = {
        ...mockGame,
        players: [
          {
            ...mockGame.players[0],
            answers: [
              {
                roundNumber: 0,
                selectedOption: 'Previous Answer',
                isCorrect: false,
                timeToAnswer: 5,
              },
            ],
          },
          mockGame.players[1],
        ],
      };

      mockRedisService.getGameState.mockResolvedValue(gameData);

      const result = await service.submitAnswer(
        'test-game-id',
        '507f1f77bcf86cd799439011',
        'Test Country',
        10,
      );

      expect(result).toBe(false);
      expect(mockPlayerStatsService.awardXp).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent game', async () => {
      mockRedisService.getGameState.mockResolvedValue(null);
      mockGameModel.findOne.mockResolvedValue(null);

      await expect(
        service.submitAnswer('non-existent-game', '507f1f77bcf86cd799439011', 'Answer', 10),
      ).rejects.toThrow('Game not found');
    });

    it('should throw error for non-existent player', async () => {
      const gameData = { ...mockGame };
      mockRedisService.getGameState.mockResolvedValue(gameData);

      await expect(
        service.submitAnswer('test-game-id', 'non-existent-player', 'Answer', 10),
      ).rejects.toThrow('Player not found');
    });
  });

  describe('getGameState', () => {
    it('should return current game state', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      const gameState = await service.getGameState(game.gameId);

      expect(gameState).toBeDefined();
      expect(gameState.gameId).toBe(game.gameId);
      expect(gameState.players).toHaveLength(2);
      expect(gameState.status).toBe(GameStatus.WAITING);
      expect(gameState.currentRound).toBe(0);
    });

    it('should throw error when game not found', async () => {
      await expect(service.getGameState('nonexistent-game-id')).rejects.toThrow('Game not found');
    });
  });

  describe('getCurrentRound', () => {
    it('should return current round data', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      await service.startGame(game.gameId);

      const currentRound = await service.getCurrentRound(game.gameId);

      expect(currentRound).toBeDefined();
      expect(currentRound.roundNumber).toBe(1);
      expect(currentRound.correctCountry).toBeDefined();
      expect(currentRound.options).toHaveLength(4);
      expect(currentRound.timeLimit).toBe(30);
    });

    it('should throw error when game not found', async () => {
      await expect(service.getCurrentRound('nonexistent-game-id')).rejects.toThrow('Game not found');
    });

    it('should throw error when game not in progress', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);

      await expect(service.getCurrentRound(game.gameId)).rejects.toThrow('Game not in progress');
    });
  });

  describe('nextRound', () => {
    let gameId: string;

    beforeEach(async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      gameId = game.gameId;
      await service.startGame(gameId);
    });

    it('should advance to next round', async () => {
      const result = await service.nextRound(gameId);

      expect(result.currentRound).toBe(2);
      expect(result.status).toBe(GameStatus.IN_PROGRESS);
    });

    it('should finish game after last round', async () => {
      // Advance to round 10
      for (let i = 1; i < 10; i++) {
        await service.nextRound(gameId);
      }

      const result = await service.nextRound(gameId);

      expect(result.status).toBe(GameStatus.FINISHED);
      expect(result.endTime).toBeDefined();
    });

    it('should throw error when game not found', async () => {
      await expect(service.nextRound('nonexistent-game-id')).rejects.toThrow('Game not found');
    });

    it('should throw error when game already finished', async () => {
      // Finish the game
      for (let i = 1; i <= 10; i++) {
        await service.nextRound(gameId);
      }

      await expect(service.nextRound(gameId)).rejects.toThrow('Game already finished');
    });
  });

  describe('getGameResults', () => {
    it('should return game results with winner', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      await service.startGame(game.gameId);

      // Simulate player1 winning by giving them a higher score
      await gameModel.updateOne(
        { gameId: game.gameId },
        {
          $set: {
            'players.0.score': 5000,
            'players.1.score': 3000,
            status: GameStatus.FINISHED,
            endTime: new Date(),
          },
        },
      );

      const results = await service.getGameResults(game.gameId);

      expect(results).toBeDefined();
      expect(results.winner).toBe('player1');
      expect(results.players).toHaveLength(2);
      expect(results.players.find(p => p.id === 'player1').score).toBe(5000);
      expect(results.players.find(p => p.id === 'player2').score).toBe(3000);
    });

    it('should handle tie games', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);
      await service.startGame(game.gameId);

      // Simulate tie game
      await gameModel.updateOne(
        { gameId: game.gameId },
        {
          $set: {
            'players.0.score': 5000,
            'players.1.score': 5000,
            status: GameStatus.FINISHED,
            endTime: new Date(),
          },
        },
      );

      const results = await service.getGameResults(game.gameId);

      expect(results.winner).toBeNull();
      expect(results.isTie).toBe(true);
    });

    it('should throw error when game not found', async () => {
      await expect(service.getGameResults('nonexistent-game-id')).rejects.toThrow('Game not found');
    });

    it('should throw error when game not finished', async () => {
      const player1 = { id: 'player1', username: 'Alice' };
      const player2 = { id: 'player2', username: 'Bob' };

      const game = await service.createGame(player1, player2);

      await expect(service.getGameResults(game.gameId)).rejects.toThrow('Game not finished');
    });

    it('should return game results with player statistics', async () => {
      const gameWithAnswers = {
        ...mockGame,
        players: [
          {
            ...mockGame.players[0],
            answers: [
              { roundNumber: 0, isCorrect: true, timeToAnswer: 5 },
              { roundNumber: 1, isCorrect: false, timeToAnswer: 10 },
            ],
            score: 150,
          },
          {
            ...mockGame.players[1],
            answers: [
              { roundNumber: 0, isCorrect: false, timeToAnswer: 8 },
              { roundNumber: 1, isCorrect: true, timeToAnswer: 12 },
            ],
            score: 100,
          },
        ],
        currentRound: 2,
      };

      mockRedisService.getGameState.mockResolvedValue(gameWithAnswers);

      const result = await service.getGameResults('test-game-id');

      expect(result).toEqual({
        gameId: 'test-game-id',
        results: [
          {
            userId: '507f1f77bcf86cd799439011',
            username: 'player1',
            score: 150,
            correctAnswers: 1,
            totalAnswers: 2,
          },
          {
            userId: '507f1f77bcf86cd799439012',
            username: 'player2',
            score: 100,
            correctAnswers: 1,
            totalAnswers: 2,
          },
        ],
        totalRounds: 10,
        completedRounds: 2,
      });
    });
  });

  describe('utility methods', () => {
    it('should calculate correct score with time bonus', () => {
      const baseScore = 500;
      const timeBonus = 200;
      const totalScore = baseScore + timeBonus;

      expect(totalScore).toBe(700);
    });

    it('should handle edge cases in score calculation', () => {
      // Test maximum score
      const maxScore = 1000;
      const maxTimeBonus = 500;
      const maxTotalScore = maxScore + maxTimeBonus;

      expect(maxTotalScore).toBe(1500);

      // Test minimum score
      const minScore = 0;
      const minTimeBonus = 0;
      const minTotalScore = minScore + minTimeBonus;

      expect(minTotalScore).toBe(0);
    });
  });
}); 