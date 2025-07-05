import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { GameService } from './game.service';
import { RedisService } from './redis.service';
import { Game, GameSchema, GameDocument, GameStatus } from '../entities/game.entity';
import { Country, CountrySchema, CountryDocument } from '../entities/country.entity';

describe('GameService (Simplified)', () => {
  let service: GameService;
  let gameModel: Model<GameDocument>;
  let countryModel: Model<CountryDocument>;
  let module: TestingModule;

  const mockRedisService = {
    setGameState: jest.fn(),
    getGameState: jest.fn(),
    deleteGameState: jest.fn(),
  };

  const mockCountries = [
    {
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
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameModel = module.get<Model<GameDocument>>(getModelToken(Game.name));
    countryModel = module.get<Model<CountryDocument>>(getModelToken(Country.name));

    // Clean up and setup test data
    await gameModel.deleteMany({});
    await countryModel.deleteMany({});
    await countryModel.insertMany(mockCountries);

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
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);

      expect(game).toBeDefined();
      expect(game.gameId).toBeDefined();
      expect(game.players).toHaveLength(2);
      expect(game.status).toBe(GameStatus.WAITING_FOR_PLAYERS);
      expect(game.currentRound).toBe(0);
      expect(game.maxRounds).toBe(10);
      expect(game.rounds).toHaveLength(10);
    });

    it('should generate game rounds with correct structure', async () => {
      // Add more countries to ensure we have enough
      const additionalCountries = [];
      for (let i = 5; i <= 15; i++) {
        additionalCountries.push({
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

      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);

      expect(game.rounds).toHaveLength(10);

      // Check each round has the correct structure
      game.rounds.forEach((round, index) => {
        expect(round.roundNumber).toBe(index);
        expect(round.flag).toBeDefined();
        expect(round.country).toBeDefined();
        expect(round.options).toHaveLength(4);
        expect(round.correctAnswer).toBeDefined();
        expect(round.timeLimit).toBe(15);
        
        // Check that correct answer is in options
        expect(round.options).toContain(round.correctAnswer);
      });
    });

    it('should throw error when insufficient countries available', async () => {
      // Clear countries so there are not enough
      await countryModel.deleteMany({});

      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      await expect(service.createGame(player1, player2)).rejects.toThrow(
        'Not enough countries in database to generate game rounds'
      );
    });
  });

  describe('getGame', () => {
    it('should retrieve a game by gameId', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const createdGame = await service.createGame(player1, player2);
      const retrievedGame = await service.getGame(createdGame.gameId);

      expect(retrievedGame).toBeDefined();
      expect(retrievedGame!.gameId).toBe(createdGame.gameId);
      expect(retrievedGame!.players).toHaveLength(2);
    });

    it('should return null for non-existent game', async () => {
      const game = await service.getGame('nonexistent-game-id');
      expect(game).toBeNull();
    });
  });

  describe('submitAnswer', () => {
    let gameId: string;

    beforeEach(async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);
      gameId = game.gameId;
    });

    it('should submit answer and return boolean result', async () => {
      const game = await service.getGame(gameId);
      const currentRound = game!.rounds[0];

      const result = await service.submitAnswer(
        gameId,
        'player1',
        currentRound.correctAnswer,
        5  // timeToAnswer
      );

      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should handle wrong answer', async () => {
      const game = await service.getGame(gameId);
      const currentRound = game!.rounds[0];
      const wrongAnswer = currentRound.options.find(opt => opt !== currentRound.correctAnswer);

      const result = await service.submitAnswer(
        gameId,
        'player1',
        wrongAnswer!,
        5  // timeToAnswer
      );

      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should throw error for invalid game', async () => {
      await expect(
        service.submitAnswer('invalid-game-id', 'player1', 'answer', 5)
      ).rejects.toThrow('Game not found');
    });
  });

  describe('checkRoundComplete', () => {
    it('should check if all players have answered', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);
      const isComplete = await service.checkRoundComplete(game.gameId);

      expect(typeof isComplete).toBe('boolean');
      expect(isComplete).toBe(false); // No answers yet
    });
  });

  describe('advanceToNextRound', () => {
    it('should advance game to next round', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);
      const canContinue = await service.advanceToNextRound(game.gameId);

      expect(typeof canContinue).toBe('boolean');
      expect(canContinue).toBe(true);
    });

    it('should return false for invalid game', async () => {
      const canContinue = await service.advanceToNextRound('invalid-game-id');
      expect(canContinue).toBe(false);
    });
  });

  describe('getGameResults', () => {
    it('should return game results', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);
      const results = await service.getGameResults(game.gameId);

      expect(results).toBeDefined();
      expect(results.gameId).toBe(game.gameId);
      expect(results.results).toHaveLength(2);
      expect(results.totalRounds).toBe(10);
    });

    it('should return null for invalid game', async () => {
      const results = await service.getGameResults('invalid-game-id');
      expect(results).toBeNull();
    });
  });

  describe('cleanupGame', () => {
    it('should cleanup game without throwing error', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);
      
      await expect(service.cleanupGame(game.gameId)).resolves.not.toThrow();
    });
  });

  describe('integration with country data', () => {
    it('should use real country data for game creation', async () => {
      const player1 = { userId: 'player1', username: 'Alice', socketId: 'socket1' };
      const player2 = { userId: 'player2', username: 'Bob', socketId: 'socket2' };

      const game = await service.createGame(player1, player2);

      // Verify that the game uses actual countries from the database
      const countryNames = await countryModel.find({}).select('name');
      const gameCountries = game.rounds.map(round => round.country);
      
      gameCountries.forEach(gameCountry => {
        const foundCountry = countryNames.find(c => c.name === gameCountry);
        expect(foundCountry).toBeDefined();
      });
    });
  });
}); 