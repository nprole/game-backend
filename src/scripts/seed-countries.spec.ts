import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Country, CountrySchema, CountryDocument } from '../game/entities/country.entity';
import { seedCountries } from './seed-countries';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Country Seeding', () => {
  let countryModel: Model<CountryDocument>;
  let module: TestingModule;

  const mockCountryData = [
    {
      name: { common: 'United States' },
      capital: ['Washington, D.C.'],
      region: 'Americas',
      subregion: 'North America',
      cca2: 'US',
      cca3: 'USA',
      flags: { png: 'https://flagcdn.com/w320/us.png' },
      flag: '🇺🇸',
    },
    {
      name: { common: 'Canada' },
      capital: ['Ottawa'],
      region: 'Americas',
      subregion: 'North America',
      cca2: 'CA',
      cca3: 'CAN',
      flags: { png: 'https://flagcdn.com/w320/ca.png' },
      flag: '🇨🇦',
    },
    {
      name: { common: 'Germany' },
      capital: ['Berlin'],
      region: 'Europe',
      subregion: 'Western Europe',
      cca2: 'DE',
      cca3: 'DEU',
      flags: { png: 'https://flagcdn.com/w320/de.png' },
      flag: '🇩🇪',
    },
  ];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/game-test-db'),
        MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
      ],
    }).compile();

    countryModel = module.get<Model<CountryDocument>>(getModelToken(Country.name));
  });

  afterAll(async () => {
    await countryModel.deleteMany({});
    await module.close();
  });

  beforeEach(async () => {
    await countryModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Database Population Tests', () => {
    it('should populate database with countries from API', async () => {
      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        data: mockCountryData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      // Mock NestJS application creation for seeding
      jest.spyOn(require('@nestjs/core'), 'NestFactory').mockImplementation(() => ({
        create: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(countryModel),
          close: jest.fn(),
        }),
      }));

      // Run seeding
      await seedCountries();

      // Verify countries were saved
      const savedCountries = await countryModel.find({});
      expect(savedCountries).toHaveLength(3);

      // Verify specific country data
      const usa = savedCountries.find(country => country.cca2 === 'US');
      expect(usa).toBeDefined();
      expect(usa?.name).toBe('United States');
      expect(usa?.capital).toBe('Washington, D.C.');
      expect(usa?.continent).toBe('Americas');
      expect(usa?.region).toBe('North America');
      expect(usa?.flagUrl).toBe('https://flagcdn.com/w320/us.png');
      expect(usa?.flagEmoji).toBe('🇺🇸');
      expect(usa?.isActive).toBe(true);
    });

    it('should verify database contains sufficient countries for game', async () => {
      // Add test countries directly to database
      await countryModel.insertMany([
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
      ]);

      // Verify minimum countries for game (need at least 13: 10 for rounds + 3 for wrong options)
      const totalCountries = await countryModel.countDocuments({ isActive: true });
      expect(totalCountries).toBeGreaterThanOrEqual(13);

      // Verify all countries have required fields
      const countries = await countryModel.find({ isActive: true });
      countries.forEach(country => {
        expect(country.name).toBeDefined();
        expect(country.capital).toBeDefined();
        expect(country.continent).toBeDefined();
        expect(country.flagUrl).toBeDefined();
        expect(country.cca2).toBeDefined();
        expect(country.cca3).toBeDefined();
      });
    });

    it('should verify countries have unique identifiers', async () => {
      await countryModel.insertMany([
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
      ]);

      // Test unique cca2 codes
      const cca2Codes = await countryModel.distinct('cca2');
      const countries = await countryModel.find({});
      expect(cca2Codes).toHaveLength(countries.length);

      // Test unique cca3 codes
      const cca3Codes = await countryModel.distinct('cca3');
      expect(cca3Codes).toHaveLength(countries.length);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      // Mock console.error to suppress error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await seedCountries();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('API Error');
      }

      consoleSpy.mockRestore();
    });

    it('should validate that flags have proper URLs', async () => {
      await countryModel.insertMany([
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
      ]);

      const countries = await countryModel.find({});
      countries.forEach(country => {
        expect(country.flagUrl).toMatch(/^https?:\/\/.+\.(png|jpg|jpeg|svg)$/i);
      });
    });
  });

  describe('Data Quality Tests', () => {
    beforeEach(async () => {
      // Insert sample data for quality tests
      await countryModel.insertMany([
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
          name: 'Vatican City',
          capital: 'Vatican City',
          continent: 'Europe',
          region: 'Southern Europe',
          flagUrl: 'https://flagcdn.com/w320/va.png',
          flagEmoji: '🇻🇦',
          code: 'VA',
          cca2: 'VA',
          cca3: 'VAT',
          isActive: true,
        },
      ]);
    });

    it('should have countries from multiple continents', async () => {
      const continents = await countryModel.distinct('continent');
      expect(continents.length).toBeGreaterThan(1);
      expect(continents).toContain('Americas');
      expect(continents).toContain('Europe');
    });

    it('should have both large and small countries', async () => {
      const countries = await countryModel.find({}).select('name');
      const countryNames = countries.map(c => c.name);
      
      // Should have both large countries and small ones
      expect(countryNames).toContain('United States');
      expect(countryNames).toContain('Vatican City');
    });

    it('should verify all active countries are game-ready', async () => {
      const activeCountries = await countryModel.find({ isActive: true });
      
      activeCountries.forEach(country => {
        // All required fields for game
        expect(country.name).toBeTruthy();
        expect(country.flagUrl).toBeTruthy();
        expect(country.cca2).toBeTruthy();
        expect(country.continent).toBeTruthy();
        
        // Valid data types
        expect(typeof country.name).toBe('string');
        expect(typeof country.capital).toBe('string');
        expect(typeof country.flagUrl).toBe('string');
        expect(typeof country.isActive).toBe('boolean');
      });
    });
  });
});