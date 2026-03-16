const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📱 VIMS Mobile Setup Wizard');
console.log('============================');

// Get local IP
const networkInterfaces = os.networkInterfaces();
let localIP = '';

for (const name of Object.keys(networkInterfaces)) {
  for (const net of networkInterfaces[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      localIP = net.address;
      break;
    }
  }
}

console.log(`\n✅ Detected IP: ${localIP}`);
console.log('\n📋 Steps to connect mobile:');
console.log('1. Ensure phone and computer are on SAME WiFi');
console.log('2. Note your computer IP:', localIP);
console.log('3. Update mobile app API URL to:');
console.log(`   http://${localIP}:5000/api`);
console.log('\n🚀 Starting servers...');

// Start backend
console.log('\n1. Starting backend server...');
try {
  execSync('cd backend && npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.log('\n⚠️  Backend already running or error occurred');
}

console.log('\n✅ Setup complete!');
console.log('\n📱 Mobile Testing:');
console.log(`   API: http://${localIP}:5000/api`);
console.log('   Web: http://localhost:3000');
console.log('\n🔧 Troubleshooting:');
console.log('   • Check firewall allows port 5000');
console.log('   • Ensure MongoDB is running');
console.log('   • Phone and computer on same network');

rl.close();