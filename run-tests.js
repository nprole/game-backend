const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
};

function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function runTests() {
  const testType = process.argv[2];

  log('\n🧪 Game Backend Test Runner', 'cyan');
  log('================================', 'cyan');

  try {
    switch (testType) {
      case 'db':
      case 'database':
        log('\n🗄️  Running Database Population Tests...', 'blue');
        await runCommand('npm', ['run', 'test:db']);
        break;

      case 'service':
      case 'game':
        log('\n🎮 Running Game Service Tests...', 'blue');
        await runCommand('npm', ['run', 'test:service']);
        break;

      case 'seeding':
      case 'seed':
        log('\n🌱 Running Country Seeding Tests...', 'blue');
        await runCommand('npm', ['run', 'test:seed']);
        break;

      case 'all':
        log('\n🔬 Running All Tests...', 'blue');
        await runCommand('npm', ['run', 'test']);
        break;

      case 'integration':
        log('\n🔗 Running Integration Tests...', 'blue');
        await runCommand('npm', ['run', 'test:integration']);
        break;

      default:
        log('\n📋 Available Test Commands:', 'yellow');
        log('  node run-tests.js db          - Test database population', 'white');
        log('  node run-tests.js service     - Test game service', 'white');
        log('  node run-tests.js seeding     - Test country seeding', 'white');
        log('  node run-tests.js integration - Test integration', 'white');
        log('  node run-tests.js all         - Run all tests', 'white');
        log('\n📝 Test Coverage:', 'yellow');
        log('  npm run test:coverage         - Generate coverage report', 'white');
        log('\n🔍 Test with Watch Mode:', 'yellow');
        log('  npm run test:watch            - Run tests in watch mode', 'white');
        return;
    }

    log('\n✅ Tests completed successfully!', 'green');
  } catch (error) {
    log('\n❌ Tests failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('\n🧪 Game Backend Test Runner', 'cyan');
  log('================================', 'cyan');
  log('\nUsage: node run-tests.js [test-type]', 'white');
  log('\nTest Types:', 'yellow');
  log('  db, database     - Database population and seeding tests', 'white');
  log('  service, game    - Game service unit tests', 'white');
  log('  seeding, seed    - Country seeding script tests', 'white');
  log('  integration      - Integration tests', 'white');
  log('  all              - All tests', 'white');
  log('\nExamples:', 'yellow');
  log('  node run-tests.js db', 'white');
  log('  node run-tests.js service', 'white');
  log('  node run-tests.js all', 'white');
  log('\nEnvironment Variables:', 'yellow');
  log('  MONGODB_URI      - MongoDB connection string', 'white');
  log('  NODE_ENV         - Environment (test/development)', 'white');
  process.exit(0);
}

runTests(); 