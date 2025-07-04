import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user object with userId and username', async () => {
      const mockPayload = {
        sub: 1,
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        username: mockPayload.username,
      });
    });

    it('should handle payload with different user data', async () => {
      const mockPayload = {
        sub: 999,
        username: 'anotheruser',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        username: mockPayload.username,
      });
    });
  });
}); 