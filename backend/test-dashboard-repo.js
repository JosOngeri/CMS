const DashboardRepository = require('./repositories/DashboardRepository');
const { pool } = require('./config/database');

async function testDashboard() {
  try {
    console.log('Testing DashboardRepository.getSummary()...');
    const summary = await DashboardRepository.getSummary();
    console.log('Summary:', summary);

    console.log('\nTesting DashboardRepository.getActivity()...');
    const announcements = await DashboardRepository.getRecentAnnouncements(5);
    console.log('Announcements:', announcements.length);

    const events = await DashboardRepository.getUpcomingEvents(5);
    console.log('Events:', events.length);

    console.log('\nTest completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDashboard();
