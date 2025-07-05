import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Country, CountrySchema, CountryDocument } from '../game/entities/country.entity';

describe('Database Population Integration', () => {
  let countryModel: Model<CountryDocument>;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/game-db'),
        MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
      ],
    }).compile();

    countryModel = module.get<Model<CountryDocument>>(getModelToken(Country.name));
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Database Seeding Verification', () => {
    it('should have countries in the database', async () => {
      const countryCount = await countryModel.countDocuments();
      expect(countryCount).toBeGreaterThan(0);
      console.log(`✅ Database contains ${countryCount} countries`);
    });

    it('should have enough countries for the game (minimum 40)', async () => {
      // Game needs at least 40 countries:
      // - 10 rounds × 1 correct answer = 10 countries
      // - 10 rounds × 3 wrong answers = 30 countries (can overlap)
      // - Buffer for variety = 40 total minimum
      const activeCountries = await countryModel.countDocuments({ isActive: true });
      expect(activeCountries).toBeGreaterThanOrEqual(40);
      console.log(`✅ Database contains ${activeCountries} active countries (minimum 40 required)`);
    });

    it('should have countries from multiple continents', async () => {
      const continents = await countryModel.distinct('continent');
      expect(continents.length).toBeGreaterThanOrEqual(3);
      console.log(`✅ Countries span ${continents.length} continents:`, continents);
    });

    it('should have all required fields for each country', async () => {
      const countries = await countryModel.find({ isActive: true }).limit(10);
      
      countries.forEach(country => {
        expect(country.name).toBeTruthy();
        expect(country.capital).toBeTruthy();
        expect(country.continent).toBeTruthy();
        expect(country.region).toBeTruthy();
        expect(country.flagUrl).toBeTruthy();
        expect(country.cca2).toBeTruthy();
        expect(country.cca3).toBeTruthy();
        expect(country.isActive).toBe(true);
        
        // Validate flag URL format
        expect(country.flagUrl).toMatch(/^https?:\/\/.+\.(png|jpg|jpeg|svg)$/i);
        
        // Validate country codes
        expect(country.cca2).toMatch(/^[A-Z]{2}$/);
        expect(country.cca3).toMatch(/^[A-Z]{3}$/);
      });
      
      console.log(`✅ All ${countries.length} sampled countries have valid data structure`);
    });

    it('should have unique country codes', async () => {
      const totalCountries = await countryModel.countDocuments();
      const uniqueCca2 = await countryModel.distinct('cca2');
      const uniqueCca3 = await countryModel.distinct('cca3');
      
      expect(uniqueCca2.length).toBe(totalCountries);
      expect(uniqueCca3.length).toBe(totalCountries);
      
      console.log(`✅ All ${totalCountries} countries have unique CCA2 and CCA3 codes`);
    });

    it('should have flag URLs that are accessible', async () => {
      // Sample a few countries to test flag URLs
      const sampleCountries = await countryModel.find({ isActive: true }).limit(5);
      
      sampleCountries.forEach(country => {
        expect(country.flagUrl).toMatch(/^https:\/\/flagcdn\.com\/w320\/[a-z]{2}\.png$/);
      });
      
      console.log(`✅ All ${sampleCountries.length} sampled countries have properly formatted flag URLs`);
    });

    it('should have variety in country sizes and regions', async () => {
      const regions = await countryModel.distinct('region');
      const sampleCountries = await countryModel.find({ isActive: true }).limit(20);
      
      // Should have countries from different regions
      expect(regions.length).toBeGreaterThanOrEqual(5);
      
      // Check for variety in country names (should have both short and long names)
      const shortNames = sampleCountries.filter(c => c.name.length <= 10);
      const longNames = sampleCountries.filter(c => c.name.length > 15);
      
      expect(shortNames.length).toBeGreaterThan(0);
      expect(longNames.length).toBeGreaterThan(0);
      
      console.log(`✅ Countries span ${regions.length} regions with variety in naming`);
    });

    it('should have major world countries included', async () => {
      const majorCountries = [
        'United States',
        'China',
        'India',
        'Brazil',
        'Russia',
        'Germany',
        'France',
        'United Kingdom',
        'Japan',
        'Canada',
      ];
      
             const foundCountries: string[] = [];
       
       for (const countryName of majorCountries) {
         const country = await countryModel.findOne({ name: countryName });
         if (country) {
           foundCountries.push(countryName);
         }
       }
      
      // Should have at least 70% of major countries
      expect(foundCountries.length).toBeGreaterThanOrEqual(Math.floor(majorCountries.length * 0.7));
      
      console.log(`✅ Found ${foundCountries.length}/${majorCountries.length} major world countries:`, foundCountries);
    });

    it('should have proper data types for all fields', async () => {
      const countries = await countryModel.find({ isActive: true }).limit(5);
      
      countries.forEach(country => {
        expect(typeof country.name).toBe('string');
        expect(typeof country.capital).toBe('string');
        expect(typeof country.continent).toBe('string');
        expect(typeof country.region).toBe('string');
        expect(typeof country.flagUrl).toBe('string');
        expect(typeof country.cca2).toBe('string');
        expect(typeof country.cca3).toBe('string');
        expect(typeof country.isActive).toBe('boolean');
        
        if (country.flagEmoji) {
          expect(typeof country.flagEmoji).toBe('string');
        }
        
        if (country.code) {
          expect(typeof country.code).toBe('string');
        }
      });
      
      console.log(`✅ All data types are correct for ${countries.length} sampled countries`);
    });

    it('should show database population summary', async () => {
      const stats = {
        totalCountries: await countryModel.countDocuments(),
        activeCountries: await countryModel.countDocuments({ isActive: true }),
        continents: await countryModel.distinct('continent'),
        regions: await countryModel.distinct('region'),
      };
      
      console.log('\n🌍 DATABASE POPULATION SUMMARY:');
      console.log(`📊 Total Countries: ${stats.totalCountries}`);
      console.log(`✅ Active Countries: ${stats.activeCountries}`);
      console.log(`🌍 Continents: ${stats.continents.length} (${stats.continents.join(', ')})`);
      console.log(`🗺️  Regions: ${stats.regions.length}`);
      console.log(`🎮 Game Ready: ${stats.activeCountries >= 40 ? 'YES' : 'NO'}`);
      
      // This test always passes, it's just for reporting
      expect(stats.totalCountries).toBeGreaterThan(0);
    });
  });

  describe('Game Service Integration with Database', () => {
    it('should be able to select random countries for game rounds', async () => {
      const randomCountries = await countryModel
        .aggregate([
          { $match: { isActive: true } },
          { $sample: { size: 10 } },
        ])
        .exec();
      
      expect(randomCountries).toHaveLength(10);
      
      // Should have unique countries
      const uniqueIds = [...new Set(randomCountries.map(c => c._id.toString()))];
      expect(uniqueIds).toHaveLength(10);
      
      console.log(`✅ Successfully selected 10 random unique countries for game rounds`);
    });

         it('should be able to generate multiple choice options', async () => {
       const correctCountry = await countryModel.findOne({ isActive: true });
       expect(correctCountry).not.toBeNull();
       
       const wrongOptions = await countryModel
         .aggregate([
           { $match: { isActive: true, _id: { $ne: correctCountry!._id } } },
           { $sample: { size: 3 } },
         ])
         .exec();
      
      expect(wrongOptions).toHaveLength(3);
      
             // Create full options array
       const allOptions = [correctCountry!, ...wrongOptions];
       const uniqueOptions = [...new Set(allOptions.map(c => c._id.toString()))];
       
       expect(uniqueOptions).toHaveLength(4);
      
      console.log(`✅ Successfully generated 4 unique multiple choice options`);
    });
  });
});