const { hashPassword } = require('./helpers/security');

hashPassword('right123').then(hash => {
  console.log('Hash for "right123":', hash);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
