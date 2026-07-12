const bcrypt = require('bcryptjs');

const password = 'right123';
const saltRounds = 8;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log('Password hash for "right123":');
  console.log(hash);
  process.exit(0);
});
