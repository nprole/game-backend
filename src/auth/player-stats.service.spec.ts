import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerStatsService, PlayerStats, XpReward } from './player-stats.service';
import { User, UserDocument } from './entities/user.entity';

describe('PlayerStatsService', () => {
  let service: PlayerStatsService;
  let userModel: Model<UserDocument>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    level: 1,
    xp: 0,
    gold: 500,
    diamonds: 50,
    rubies: 10,
    save: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerStatsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<PlayerStatsService>(PlayerStatsService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getXpForLevel', () => {
    it('should calculate XP for levels 1-10 correctly', () => {
      expect(service.getXpForLevel(1)).toBe(120);
      expect(service.getXpForLevel(5)).toBe(200);
      expect(service.getXpForLevel(10)).toBe(300);
    });

    it('should calculate XP for levels above 10 correctly', () => {
      expect(service.getXpForLevel(11)).toBe(186);
      expect(service.getXpForLevel(20)).toBe(239);
    });
  });

  describe('getTotalXpForLevel', () => {
    it('should calculate total XP needed for a level', () => {
      expect(service.getTotalXpForLevel(1)).toBe(0);
      expect(service.getTotalXpForLevel(2)).toBe(120);
      expect(service.getTotalXpForLevel(3)).toBe(260);
    });
  });

  describe('getXpPercentage', () => {
    it('should calculate XP percentage correctly', () => {
      expect(service.getXpPercentage(60, 1)).toBe(50);
      expect(service.getXpPercentage(120, 1)).toBe(100);
      expect(service.getXpPercentage(150, 1)).toBe(100);
    });
  });

  describe('getPlayerStats', () => {
    it('should return player stats for existing user', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.getPlayerStats('507f1f77bcf86cd799439011');

      expect(result).toEqual({
        level: 1,
        xp: 0,
        gold: 500,
        diamonds: 50,
        rubies: 10,
      });
    });

    it('should initialize missing fields for existing user', async () => {
      const userWithoutNewFields = {
        ...mockUser,
        level: undefined,
        xp: undefined,
        gold: undefined,
        diamonds: undefined,
        rubies: undefined,
      };

      mockUserModel.findById.mockResolvedValue(userWithoutNewFields);

      const result = await service.getPlayerStats('507f1f77bcf86cd799439011');

      expect(userWithoutNewFields.level).toBe(1);
      expect(userWithoutNewFields.xp).toBe(0);
      expect(userWithoutNewFields.gold).toBe(500);
      expect(userWithoutNewFields.diamonds).toBe(50);
      expect(userWithoutNewFields.rubies).toBe(10);
      expect(userWithoutNewFields.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.getPlayerStats('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('awardXp', () => {
    it('should award correct XP for correct answer', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(result.xpGained).toBe(50);
      expect(result.leveledUp).toBe(false);
      expect(testUser.xp).toBe(50);
      expect(testUser.save).toHaveBeenCalled();
    });

    it('should award less XP for wrong answer', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', false);

      expect(result.xpGained).toBe(10);
      expect(result.leveledUp).toBe(false);
      expect(testUser.xp).toBe(10);
    });

    it('should award bonus XP for fast answers', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true, 3);

      expect(result.xpGained).toBe(65); // 50 + 15 speed bonus
      expect(testUser.xp).toBe(65);
    });

    it('should award streak bonus XP', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true, 10, 3);

      expect(result.xpGained).toBe(65); // 50 + 15 streak bonus (3 * 5)
      expect(testUser.xp).toBe(65);
    });

    it('should handle level-up correctly', async () => {
      const testUser = { ...mockUser, xp: 100, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(testUser.level).toBe(2);
      expect(testUser.xp).toBe(30); // 100 + 50 - 120 (XP for level 1)
      expect(testUser.gold).toBeGreaterThan(600); // 500 + 100 (level up) + 10-30 (correct answer)
    });

    it('should handle multiple level-ups', async () => {
      const testUser = { ...mockUser, xp: 200, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(result.leveledUp).toBe(true);
      expect(testUser.level).toBe(2);
      expect(testUser.xp).toBe(130); // 200 + 50 - 120 (XP for level 1)
    });

    it('should award milestone rewards', async () => {
      const testUser = { ...mockUser, level: 9, xp: 280, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(result.leveledUp).toBe(true);
      expect(testUser.level).toBe(10);
      expect(testUser.diamonds).toBe(55); // 50 + 5 (milestone reward)
      expect(testUser.rubies).toBe(11); // 10 + 1 (milestone reward)
    });

    it('should not level up beyond 100', async () => {
      const testUser = { ...mockUser, level: 100, xp: 1000, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(result.leveledUp).toBe(false);
      expect(testUser.level).toBe(100);
      expect(testUser.xp).toBe(1050);
    });

    it('should initialize missing fields before awarding XP', async () => {
      const userWithoutNewFields = {
        ...mockUser,
        level: undefined,
        xp: undefined,
        gold: undefined,
        diamonds: undefined,
        rubies: undefined,
        save: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(userWithoutNewFields);

      const result = await service.awardXp('507f1f77bcf86cd799439011', true);

      expect(userWithoutNewFields.level).toBe(1);
      expect(userWithoutNewFields.xp).toBe(50);
      expect(userWithoutNewFields.gold).toBeGreaterThan(500);
    });
  });

  describe('spendCurrency', () => {
    it('should spend currency successfully when user has enough', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.spendCurrency('507f1f77bcf86cd799439011', 100, 10, 5);

      expect(result).toBe(true);
      expect(testUser.gold).toBe(400);
      expect(testUser.diamonds).toBe(40);
      expect(testUser.rubies).toBe(5);
      expect(testUser.save).toHaveBeenCalled();
    });

    it('should fail when user does not have enough currency', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      const result = await service.spendCurrency('507f1f77bcf86cd799439011', 1000, 10, 5);

      expect(result).toBe(false);
      expect(testUser.gold).toBe(500); // unchanged
      expect(testUser.save).not.toHaveBeenCalled();
    });
  });

  describe('awardCurrency', () => {
    it('should award currency successfully', async () => {
      const testUser = { ...mockUser, save: jest.fn() };
      mockUserModel.findById.mockResolvedValue(testUser);

      await service.awardCurrency('507f1f77bcf86cd799439011', 100, 10, 5);

      expect(testUser.gold).toBe(600);
      expect(testUser.diamonds).toBe(60);
      expect(testUser.rubies).toBe(15);
      expect(testUser.save).toHaveBeenCalled();
    });

    it('should initialize missing fields before awarding currency', async () => {
      const userWithoutNewFields = {
        ...mockUser,
        level: undefined,
        xp: undefined,
        gold: undefined,
        diamonds: undefined,
        rubies: undefined,
        save: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(userWithoutNewFields);

      await service.awardCurrency('507f1f77bcf86cd799439011', 100, 10, 5);

      expect(userWithoutNewFields.gold).toBe(600);
      expect(userWithoutNewFields.diamonds).toBe(60);
      expect(userWithoutNewFields.rubies).toBe(15);
    });
  });
}); 