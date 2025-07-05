import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema({ timestamps: true })
export class Country {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  capital: string;

  @Prop({ required: true })
  continent: string;

  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  flagUrl: string;

  @Prop({ required: true })
  flagEmoji: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true, unique: true })
  cca2: string;

  @Prop({ required: true, unique: true })
  cca3: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CountrySchema = SchemaFactory.createForClass(Country);

// Legacy interface for backward compatibility
export interface CountryLegacy {
  name: string;
  flag: string;
  code: string;
}

// For backward compatibility, we'll keep the old COUNTRIES array but it will be populated from the database
export const COUNTRIES: CountryLegacy[] = [];
