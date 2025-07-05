import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

export interface Player {
  userId: string;
  username: string;
  socketId: string;
  score: number;
  answers: PlayerAnswer[];
}

export interface PlayerAnswer {
  roundNumber: number;
  selectedOption: string;
  isCorrect: boolean;
  timeToAnswer: number;
}

export interface GameRound {
  roundNumber: number;
  flag: string;
  country: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
}

export enum GameStatus {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ required: true, unique: true })
  gameId: string;

  @Prop({ required: true })
  players: Player[];

  @Prop({ required: true })
  rounds: GameRound[];

  @Prop({ required: true, default: 0 })
  currentRound: number;

  @Prop({
    required: true,
    enum: GameStatus,
    default: GameStatus.WAITING_FOR_PLAYERS,
  })
  status: GameStatus;

  @Prop({ default: Date.now })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: 10 })
  maxRounds: number;

  @Prop({ default: 15 })
  roundTimeLimit: number;
}

export const GameSchema = SchemaFactory.createForClass(Game);
