import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Country, CountrySchema } from '../game/entities/country.entity';
import axios from 'axios';

// Create a simple module for seeding
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/game-db',
    ),
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
  ],
})
class SeedModule {}

interface RestCountryResponse {
  name: {
    common: string;
    official: string;
  };
  capital?: string[];
  region: string;
  subregion: string;
  cca2: string;
  cca3: string;
  flags: {
    png: string;
    svg: string;
  };
  flag: string; // emoji flag
}

function getCountryCodeFromEmoji(emoji: string): string {
  // Convert emoji flag to country code
  const codePoints = [...emoji].map((char) => char.codePointAt(0));
  if (codePoints.length === 2) {
    const firstCode = codePoints[0]! - 0x1f1e6;
    const secondCode = codePoints[1]! - 0x1f1e6;
    return (
      String.fromCharCode(65 + firstCode) + String.fromCharCode(65 + secondCode)
    );
  }
  return '';
}

async function seedCountries() {
  console.log('🌍 Starting country data seeding...');

  try {
    // Create NestJS application
    const app = await NestFactory.create(SeedModule);
    const countryModel = app.get<Model<Country>>(getModelToken(Country.name));

    // Fetch data from REST Countries API
    console.log('📡 Fetching country data from REST Countries API...');

    const response = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,cca2,cca3,flags,flag',
    );
    const countries = response.data as RestCountryResponse[];

    if (!Array.isArray(countries)) {
      throw new Error('API response is not an array of countries');
    }

    console.log(`📊 Found ${countries.length} countries from API`);

    // Clear existing data
    console.log('🧹 Clearing existing country data...');
    await countryModel.deleteMany({});

    // Process and save countries
    const savedCountries: string[] = [];
    const skippedCountries: string[] = [];

    for (const country of countries) {
      try {
        // Skip countries without required data
        if (!country.name?.common || !country.flags?.png || !country.cca2) {
          skippedCountries.push(country.name?.common || 'Unknown');
          continue;
        }

        // Get the primary capital (first one if multiple)
        const capital = country.capital?.[0] || 'N/A';

        // Generate code from emoji if available, otherwise use cca2
        const code = country.flag
          ? getCountryCodeFromEmoji(country.flag)
          : country.cca2;

        const countryData = {
          name: country.name.common,
          capital: capital,
          continent: country.region,
          region: country.subregion || country.region,
          flagUrl: country.flags.png,
          flagEmoji: country.flag || '🏳️',
          code: code || country.cca2,
          cca2: country.cca2,
          cca3: country.cca3,
          isActive: true,
        };

        await countryModel.create(countryData);
        savedCountries.push(countryData.name);

        // Log progress every 50 countries
        if (savedCountries.length % 50 === 0) {
          console.log(`✅ Processed ${savedCountries.length} countries...`);
        }
      } catch (error) {
        console.error(
          `❌ Error processing ${country.name?.common}:`,
          error.message,
        );
        skippedCountries.push(country.name?.common || 'Unknown');
      }
    }

    console.log('\n📈 Seeding Results:');
    console.log(`✅ Successfully saved: ${savedCountries.length} countries`);
    console.log(`⚠️  Skipped: ${skippedCountries.length} countries`);

    if (skippedCountries.length > 0) {
      console.log('\n⚠️  Skipped countries:', skippedCountries.join(', '));
    }

    // Show some examples
    console.log('\n🎯 Sample data saved:');
    const sampleCountries = await countryModel.find({}).limit(5);
    sampleCountries.forEach((country) => {
      console.log(
        `   ${country.flagEmoji} ${country.name} (${country.capital}) - ${country.continent}`,
      );
    });

    await app.close();
    console.log('\n🎉 Country seeding completed successfully!');
  } catch (error) {
    console.error('💥 Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  seedCountries();
}

export { seedCountries };
