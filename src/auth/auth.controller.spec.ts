import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PlayerStatsService } from './player-stats.service';
import { UserService } from './user.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let playerStatsService: PlayerStatsService;
  let userService: UserService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockPlayerStatsService = {
    getPlayerStats: jest.fn(),
  };

  const mockUserService = {
    getLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PlayerStatsService,
          useValue: mockPlayerStatsService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    playerStatsService = module.get<PlayerStatsService>(PlayerStatsService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlayerStats', () => {
    it('should return player stats for authenticated user', async () => {
      const mockStats = {
        level: 5,
        xp: 250,
        gold: 1000,
        diamonds: 75,
        rubies: 15,
      };

      const mockRequest = {
        user: { userId: '507f1f77bcf86cd799439011' },
      };

      mockPlayerStatsService.getPlayerStats.mockResolvedValue(mockStats);

      const result = await controller.getPlayerStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(mockPlayerStatsService.getPlayerStats).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw error when user stats not found', async () => {
      const mockRequest = {
        user: { userId: '507f1f77bcf86cd799439011' },
      };

      mockPlayerStatsService.getPlayerStats.mockRejectedValue(new Error('User not found'));

      await expect(controller.getPlayerStats(mockRequest)).rejects.toThrow('User not found');
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const mockRequest = {
        user: { _id: '507f1f77bcf86cd799439011', username: 'testuser' },
      };

      const mockLoginResponse = {
        access_token: 'jwt-token',
        user: { id: '507f1f77bcf86cd799439011', username: 'testuser' },
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(mockLoginResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('register', () => {
    it('should create new user account', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const mockRegisterResponse = {
        message: 'User registered successfully',
        user: { id: '507f1f77bcf86cd799439011', username: 'newuser' },
      };

      mockAuthService.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(userData);

      expect(result).toEqual(mockRegisterResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
    });
  });

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockRequest = {
        user: { userId: '507f1f77bcf86cd799439011' },
      };

      const mockProfile = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockProfile);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });

  describe('getLeaderboard', () => {
    it('should return the top 50 users sorted by level and experience', async () => {
      const mockUsers = [
        { username: 'A', level: 10, xp: 1000 },
        { username: 'B', level: 10, xp: 900 },
        { username: 'C', level: 9, xp: 2000 },
      ];
      mockUserService.getLeaderboard.mockResolvedValue(mockUsers);
      const result = await controller.getLeaderboard();
      expect(result).toEqual([
        { rank: 1, username: 'A', level: 10, experience: 1000 },
        { rank: 2, username: 'B', level: 10, experience: 900 },
        { rank: 3, username: 'C', level: 9, experience: 2000 },
      ]);
    });

    it('should return an empty array if no users found', async () => {
      mockUserService.getLeaderboard.mockResolvedValue([]);
      const result = await controller.getLeaderboard();
      expect(result).toEqual([]);
    });
  });
});
