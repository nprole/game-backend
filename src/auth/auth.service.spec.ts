import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { UserDocument } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUserService = {
    findByUsername: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
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

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'test',
        email: 'test@example.com',
        password: await bcrypt.hash('test', 10),
        isActive: true,
        level: 1,
        xp: 0,
        gold: 500,
        diamonds: 50,
        rubies: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          username: 'test',
          email: 'test@example.com',
        }),
      } as UserDocument;

      mockUserService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.validateUser(username, password);

      expect(result).toBeDefined();
      expect(result.username).toBe(username);
      expect(result.password).toBeUndefined();
    });

    it('should return null when invalid credentials are provided', async () => {
      const username = 'test';
      const password = 'wrongpass';

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'test',
        email: 'test@example.com',
        password: await bcrypt.hash('test', 10),
        isActive: true,
        level: 1,
        xp: 0,
        gold: 500,
        diamonds: 50,
        rubies: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          username: 'test',
          email: 'test@example.com',
        }),
      } as UserDocument;

      mockUserService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token when valid user is provided', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        isActive: true,
        level: 1,
        xp: 0,
        gold: 500,
        diamonds: 50,
        rubies: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          email: 'test@example.com',
        }),
      } as UserDocument;

      const expectedToken = 'jwt-token';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser._id,
      });
      expect(result).toEqual({
        access_token: expectedToken,
        user: {
          id: mockUser._id,
          username: mockUser.username,
          email: mockUser.email,
        },
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

      const mockCreatedUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'newuser',
        email: 'newuser@example.com',
        toObject: () => ({
          _id: '507f1f77bcf86cd799439011',
          username: 'newuser',
          email: 'newuser@example.com',
        }),
      } as UserDocument;

      mockUserService.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register(userData);

      expect(result).toEqual({
        message: 'User registered successfully',
        user: {
          _id: '507f1f77bcf86cd799439011',
          username: 'newuser',
          email: 'newuser@example.com',
        },
      });
    });

    it('should throw error when password is missing', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        // password is missing
      };

      mockUserService.create.mockRejectedValue(new Error('Password is required'));

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

      mockUserService.create.mockRejectedValue(new Error('Password is required'));

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

      mockUserService.create.mockRejectedValue(new Error('Password is required'));

      await expect(service.register(userData)).rejects.toThrow(
        'Password is required',
      );
    });
  });
});
