const https = require('https');

const url = 'https://vims-backend.onrender.com/api/health';

console.log('Testing backend connectivity...');
console.log('URL:', url);

https.get(url, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
}).on('error', (e) => {
  console.error('ERROR:', e.message);
  console.error('This could mean:');
  console.log('1. Backend is sleeping (Render free tier)');
  console.log('2. Network/firewall blocking the request');
  console.log('3. Backend URL is incorrect');
  console.log('4. Backend is not deployed properly');
  process.exit(1);
});