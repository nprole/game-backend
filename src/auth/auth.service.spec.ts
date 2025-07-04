import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user object when valid credentials are provided', async () => {
      const username = 'test';
      const password = 'test';

      const result = await service.validateUser(username, password);

      expect(result).toBeDefined();
      expect(result.username).toBe(username);
      expect(result.password).toBeUndefined();
    });

    it('should return null when invalid credentials are provided', async () => {
      const username = 'test';
      const password = 'wrongpass';

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token when valid user is provided', async () => {
      const user = { id: 1, username: 'testuser' };
      const expectedToken = 'jwt-token';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: user.username,
        sub: user.id,
      });
      expect(result).toEqual({
        access_token: expectedToken,
      });
    });
  });

  describe('register', () => {
    it('should successfully register a new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const result = await service.register(userData);

      expect(result).toEqual({
        message: 'User registered successfully',
      });
    });

    it('should throw error when password is missing', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        // password is missing
      };

      await expect(service.register(userData)).rejects.toThrow(
        'Password is required',
      );
    });

    it('should throw error when password is undefined', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: undefined,
      };

      await expect(service.register(userData)).rejects.toThrow(
        'Password is required',
      );
    });

    it('should throw error when password is empty string', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: '',
      };

      await expect(service.register(userData)).rejects.toThrow(
        'Password is required',
      );
    });
  });
}); 