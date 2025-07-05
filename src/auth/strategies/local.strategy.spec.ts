import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when valid credentials are provided', async () => {
      const username = 'testuser';
      const password = 'testpass';
      const mockUser = { id: 1, username: 'testuser' };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(username, password);

      expect(authService.validateUser).toHaveBeenCalledWith(username, password);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when invalid credentials are provided', async () => {
      const username = 'testuser';
      const password = 'wrongpass';

      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateUser).toHaveBeenCalledWith(username, password);
    });
  });
});
