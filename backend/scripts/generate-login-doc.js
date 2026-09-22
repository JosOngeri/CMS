/**
 * Generate USER_LOGINS.md from a psql export (username|email|church|roles|phone).
 * Usage: node scripts/generate-login-doc.js <export-file> <output-file>
 */
const fs = require('fs');

const input = process.argv[2] || 'cms_users_export.txt';
const output = process.argv[3] || 'USER_LOGINS.md';

const lines = fs.readFileSync(input, 'utf8').split('\n').filter(l => l.trim());
const byChurch = {};
lines.forEach(l => {
  const [username, email, church, roles, phone] = l.split('|');
  (byChurch[church] = byChurch[church] || []).push({ username, email, roles, phone, church });
});

const churchNames = {
  'newlife': 'New Life',
  'mount-horeb': 'Mount Horeb',
  'kiserian-dam': 'Kiserian Dam',
  'kiserian-main-sda': 'Kiserian Main SDA',
  '-': '(no church assigned)'
};

let md = '# KMainCMS - User Login Details\n\n';
md += `**Site:** https://msabato.co.ke  \n`;
md += `**Generated:** ${new Date().toISOString().slice(0, 10)}  \n`;
md += `**Password for every account:** \`right123\`\n\n`;
md += '> Member phone numbers were randomly generated (+2547...) during seeding and are not real numbers.\n\n';

// Admin / staff (non memberN@ accounts)
const staff = [];
Object.keys(byChurch).forEach(slug => {
  byChurch[slug].forEach(u => { if (!/^member\d+@/.test(u.username)) staff.push(u); });
});

md += '## Admin & Staff Accounts\n\n';
md += '| Username | Email | Church | Role |\n|---|---|---|---|\n';
staff.forEach(u => {
  md += `| ${u.username} | ${u.email} | ${churchNames[u.church] || u.church} | ${u.roles} |\n`;
});
md += '\n';

// Members per church
Object.keys(byChurch).sort().forEach(slug => {
  const members = byChurch[slug].filter(u => /^member\d+@/.test(u.username));
  if (!members.length) return;
  members.sort((a, b) => parseInt(a.username.match(/\d+/)[0]) - parseInt(b.username.match(/\d+/)[0]));
  const prefix = slug.slice(0, 2).toUpperCase();
  md += `## ${churchNames[slug] || slug} (\`${slug}\`) - ${members.length} members\n\n`;
  md += '| # | Username / Email | Phone | Membership No. |\n|---|---|---|---|\n';
  members.forEach(u => {
    const num = u.username.match(/\d+/)[0];
    md += `| ${num} | ${u.email} | ${u.phone} | ${prefix}-${num.padStart(4, '0')} |\n`;
  });
  md += '\n';
});

fs.writeFileSync(output, md);
console.log(`Wrote ${output} - ${lines.length} users, ${staff.length} staff accounts`);
