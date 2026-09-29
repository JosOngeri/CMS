/**
 * Canonical SDA department catalog.
 *
 * Source: "2026 Church Workers Kiserian Main.docx" (Kiserian Main SDA
 * Communications Department). Shared by all churches — parents are resolved
 * per-church after insertion (two-pass: parents first, then children).
 *
 * Categories: Leadership, Ministry, Youth, Worship, Education, Support, Special
 * (Special entries are committees — e.g. Camp Meeting, Development, Welfare).
 */

const SDA_DEPARTMENTS = [
  // Leadership
  { name: 'Elders', slug: 'elders', category: 'Leadership' },
  { name: 'Deacons', slug: 'deacons', category: 'Leadership' },
  { name: 'Deaconesses', slug: 'deaconesses', category: 'Leadership' },
  { name: 'Treasury', slug: 'treasury', category: 'Leadership' },
  { name: 'Church Clerk', slug: 'church-clerk', category: 'Leadership' },
  { name: 'Stewardship', slug: 'stewardship', category: 'Leadership' },
  { name: 'Religious Liberty', slug: 'religious-liberty', category: 'Leadership' },

  // Ministry
  { name: 'Personal Ministry', slug: 'personal-ministry', category: 'Ministry' },
  { name: 'Interest Coordinator', slug: 'interest-coordinator', category: 'Ministry', parent: 'personal-ministry' },
  { name: 'Evangelism', slug: 'evangelism', category: 'Ministry', parent: 'personal-ministry' },
  { name: 'Publishing Ministry', slug: 'publishing-ministry', category: 'Ministry' },
  { name: 'V.O.P./S.O.P.', slug: 'vop-sop', category: 'Ministry', parent: 'publishing-ministry' },
  { name: 'Health Ministry', slug: 'health-ministry', category: 'Ministry' },
  { name: 'Family Life', slug: 'family-life', category: 'Ministry' },
  { name: 'Prayer Ministry', slug: 'prayer-ministry', category: 'Ministry' },
  { name: 'Nurture and Retention', slug: 'nurture-and-retention', category: 'Ministry' },
  { name: 'Adventist Women Ministry', slug: 'adventist-women-ministry', category: 'Ministry' },
  { name: "Annah's Family", slug: 'annahs-family', category: 'Ministry', parent: 'adventist-women-ministry' },
  { name: 'Adventist Men Ministry', slug: 'adventist-men-ministry', category: 'Ministry' },
  { name: 'Adventist Possibility Ministry', slug: 'adventist-possibility-ministry', category: 'Ministry' },
  { name: 'Dorcas', slug: 'dorcas', category: 'Ministry' },
  { name: 'Chaplaincy', slug: 'chaplaincy', category: 'Ministry' },
  { name: 'A.M.R.', slug: 'amr', category: 'Ministry' },

  // Youth
  { name: 'Youth Ministry', slug: 'youth-ministry', category: 'Youth' },
  { name: 'Pathfinder Club', slug: 'pathfinder-club', category: 'Youth', parent: 'youth-ministry' },
  { name: 'Adventurer Club', slug: 'adventurer-club', category: 'Youth', parent: 'youth-ministry' },
  { name: 'Ambassadors', slug: 'ambassadors', category: 'Youth', parent: 'youth-ministry' },
  { name: 'Master Guide', slug: 'master-guide', category: 'Youth', parent: 'youth-ministry' },
  { name: 'Children Ministry', slug: 'children-ministry', category: 'Youth' },
  { name: 'VBS', slug: 'vbs', category: 'Youth', parent: 'children-ministry' },
  { name: 'KID - Kids in Discipleship', slug: 'kid-kids-in-discipleship', category: 'Youth', parent: 'children-ministry' },

  // Worship
  { name: 'Music Ministry', slug: 'music-ministry', category: 'Worship' },
  { name: 'Church Choir', slug: 'church-choir', category: 'Worship', parent: 'music-ministry' },
  { name: 'Choristers', slug: 'choristers', category: 'Worship', parent: 'music-ministry' },
  { name: 'Pianist', slug: 'pianist', category: 'Worship', parent: 'music-ministry' },

  // Education
  { name: 'Sabbath School', slug: 'sabbath-school', category: 'Education' },
  { name: 'Librarian', slug: 'librarian', category: 'Education', parent: 'sabbath-school' },
  { name: 'Education', slug: 'education', category: 'Education' },
  { name: 'School Chair', slug: 'school-chair', category: 'Education', parent: 'education' },

  // Support
  { name: 'Communication', slug: 'communication', category: 'Support' },
  { name: 'PA System', slug: 'pa-system', category: 'Support', parent: 'communication' },

  // Special committees
  { name: 'Camp Meeting', slug: 'camp-meeting', category: 'Special', isCommittee: true },
  { name: 'Development', slug: 'development', category: 'Special', isCommittee: true },
  { name: 'Welfare', slug: 'welfare', category: 'Special', isCommittee: true },
];

module.exports = { SDA_DEPARTMENTS };
