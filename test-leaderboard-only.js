const { execSync } = require('child_process');

console.log('🧪 Running Leaderboard Tests Only...\n');

try {
  // Run only the auth controller test (which includes leaderboard)
  execSync('npx jest src/auth/auth.controller.spec.ts --verbose', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('\n✅ Leaderboard backend tests passed!');
} catch (error) {
  console.log('\n❌ Leaderboard backend tests failed:', error.message);
  process.exit(1);
} 