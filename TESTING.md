# Testing Documentation

## Overview

This document describes the comprehensive testing suite created for the Game Backend, including database population verification and GameService unit tests.

## Test Suites Created

### 1. Database Population Integration Tests
**File:** `src/scripts/database-population.integration.spec.ts`

**Purpose:** Verifies that the database is properly populated with countries from the seeding process.

**Test Categories:**
- **Database Seeding Verification:**
  - ✅ Checks if countries exist in database
  - ✅ Verifies minimum country count for game (40+ countries)
  - ✅ Validates multiple continents represented
  - ✅ Ensures all required fields are present
  - ✅ Confirms unique country codes (CCA2, CCA3)
  - ✅ Validates flag URL formats
  - ✅ Checks variety in country sizes and regions
  - ✅ Verifies major world countries are included
  - ✅ Validates data types for all fields
  - 📊 Provides comprehensive database summary

- **Game Service Integration:**
  - ✅ Tests random country selection for game rounds
  - ✅ Validates multiple choice option generation

### 2. Country Seeding Tests
**File:** `src/scripts/seed-countries.spec.ts`

**Purpose:** Unit tests for the country seeding script functionality.

**Test Categories:**
- API integration testing with mocked responses
- Database population verification
- Error handling for API failures
- Data validation and transformation

### 3. GameService Unit Tests
**File:** `src/game/services/game.service.spec.ts` (Original)
**File:** `src/game/services/game.service.simple.spec.ts` (Simplified)

**Purpose:** Comprehensive unit tests for the GameService class.

**Test Categories:**
- ✅ Game creation with correct initial values
- ✅ Game round generation with proper structure
- ✅ Player management and state tracking
- ✅ Answer submission and scoring logic
- ✅ Round progression and game completion
- ✅ Error handling for invalid inputs
- ✅ Integration with country data

## Test Commands

### Package.json Scripts
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:db": "jest --testPathPattern=database-population.integration.spec.ts",
  "test:service": "jest --testPathPattern=game.service.spec.ts",
  "test:seed": "jest --testPathPattern=seed-countries.spec.ts",
  "test:integration": "jest --testPathPattern=integration.spec.ts",
  "test:coverage": "jest --coverage --coverageReporters=text-lcov --coverageReporters=html"
}
```

### Test Runner Script
**File:** `run-tests.js`

```bash
# Test database population
node run-tests.js db

# Test game service
node run-tests.js service

# Test country seeding
node run-tests.js seeding

# Run all tests
node run-tests.js all

# Help
node run-tests.js --help
```

## Database Verification Tools

### Manual Verification Scripts
**File:** `verify-database.js` - Comprehensive database verification
**File:** `check-database.js` - Quick database structure check

```bash
# Verify database population
node verify-database.js

# Check database structure
node check-database.js
```

## Test Examples and Expected Output

### Successful Database Population Test
```
🌍 DATABASE POPULATION SUMMARY:
📊 Total Countries: 250
✅ Active Countries: 250
🌍 Continents: 6 (Africa, Antarctica, Asia, Europe, North America, South America, Oceania)
🗺️ Regions: 18
🎮 Game Ready: YES

✅ Database contains 250 countries
✅ Database contains 250 active countries (minimum 40 required)
✅ Countries span 6 continents: Africa, Asia, Europe, etc.
✅ Found 10/10 major world countries: United States, China, India, etc.
✅ Successfully selected 10 random unique countries for game rounds
✅ Successfully generated 4 unique multiple choice options
```

### GameService Test Results
```
GameService (Simplified)
  ✓ should create a new game with correct initial values
  ✓ should generate game rounds with correct structure
  ✓ should throw error when insufficient countries available
  ✓ should retrieve a game by gameId
  ✓ should submit answer and return boolean result
  ✓ should handle wrong answer
  ✓ should advance game to next round
  ✓ should return game results
  ✓ should use real country data for game creation
```

## Test Data Requirements

### Minimum Database Requirements for Games
- **Minimum Countries:** 40 (for sufficient variety)
- **Optimal Countries:** 100+ (for better randomization)
- **Required Fields:** name, capital, continent, flagUrl, cca2, cca3, isActive
- **Continental Coverage:** 3+ continents minimum
- **Regional Variety:** 5+ regions recommended

### Test Database vs Production Database
- **Production Database:** `mongodb://localhost:27017/game-db`
- **Test Database:** `mongodb://localhost:27017/game-test-db`
- Tests use isolated test database to avoid affecting production data
- Seeding script populates production database
- Integration tests can be run against production database for verification

## Key Test Features

### 1. Database Population Verification
- Confirms sufficient countries for game functionality
- Validates data quality and completeness
- Checks global representation (continents, regions)
- Ensures flag URLs are properly formatted
- Verifies unique identifiers (country codes)

### 2. Game Logic Testing
- Tests complete game creation flow
- Validates round generation with unique countries
- Confirms multiple choice option generation
- Tests answer submission and scoring
- Verifies game state management

### 3. Error Handling
- Tests insufficient country scenarios
- Validates invalid input handling
- Confirms proper error messages
- Tests edge cases and boundary conditions

### 4. Integration Testing
- Combines database operations with game logic
- Tests real data flow scenarios
- Validates cross-component functionality
- Ensures proper data persistence

## Running Tests

### Prerequisites
```bash
npm install
```

### Environment Setup
```bash
# Ensure MongoDB is running
# Ensure test database is accessible
export MONGODB_URI=mongodb://localhost:27017/game-db
```

### Test Execution
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:db
npm run test:service
npm run test:seed

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Test Results Interpretation

### Database Population Tests
- **PASS:** Database is properly seeded and game-ready
- **FAIL:** Database needs seeding or has insufficient data

### GameService Tests
- **PASS:** Game logic functions correctly
- **FAIL:** Issues with game creation, round generation, or state management

### Integration Tests
- **PASS:** Complete system works end-to-end
- **FAIL:** Data flow or component integration issues

## Troubleshooting

### Common Issues
1. **Database Connection:** Ensure MongoDB is running and accessible
2. **Insufficient Countries:** Run `npm run seed:countries` first
3. **Test Database:** Tests use separate test database for isolation
4. **Environment Variables:** Check MONGODB_URI configuration

### Debug Commands
```bash
# Check database status
node check-database.js

# Verify seeding worked
node verify-database.js

# Run specific failing test
npm test -- --testNamePattern="specific test name"
```

## Summary

The testing suite provides comprehensive coverage for:
- ✅ Database population verification
- ✅ Game service functionality
- ✅ Country seeding process
- ✅ Integration between components
- ✅ Error handling and edge cases
- ✅ Data quality validation
- ✅ Game readiness confirmation

All tests are designed to ensure the game backend functions correctly with properly seeded country data and robust game logic. 