import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token when login is successful', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      const mockRequest = { user: mockUser };
      const expectedResult = { access_token: 'jwt-token' };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(mockRequest);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      };
      const expectedResult = { message: 'User registered successfully' };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(userData);

      expect(authService.register).toHaveBeenCalledWith(userData);
      expect(result).toEqual(expectedResult);
    });

    it('should handle registration with minimal user data', async () => {
      const userData = {
        username: 'minimaluser',
        password: 'password123',
      };
      const expectedResult = { message: 'User registered successfully' };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(userData);

      expect(authService.register).toHaveBeenCalledWith(userData);
      expect(result).toEqual(expectedResult);
    });
  });
}); 