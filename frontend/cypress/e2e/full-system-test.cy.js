/**
 * Full System Test using Cypress
 * Validates all major modules and captures screenshots.
 */

describe('KMainCMS Full System Test', () => {
  const baseUrl = 'http://localhost:5180';

  beforeEach(() => {
    // Navigate to login
    cy.visit(`${baseUrl}/auth/login`);
  });

  it('Walks through all major modules as Super Admin', () => {
    // 1. Login
    cy.get('input[name="email"]').type('admin@kmaincms.org');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Verify Dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard').should('be.visible');
    cy.screenshot('01-dashboard');

    // 2. Members
    cy.get('nav').contains('Members').click();
    cy.url().should('include', '/members');
    cy.screenshot('02-members');

    // 3. Departments
    cy.get('nav').contains('Departments').click();
    cy.url().should('include', '/departments');
    cy.screenshot('03-departments');

    // 4. Payments
    cy.get('nav').contains('Payments').click();
    cy.url().should('include', '/payments');
    cy.screenshot('04-payments');

    // 5. SMS
    cy.get('nav').contains('SMS').click();
    cy.url().should('include', '/sms');
    cy.screenshot('05-sms');

    // 6. Announcements
    cy.get('nav').contains('Announcements').click();
    cy.url().should('include', '/announcements');
    cy.screenshot('06-announcements');

    // 7. Events
    cy.get('nav').contains('Events').click();
    cy.url().should('include', '/events');
    cy.screenshot('07-events');

    // 8. Approvals
    cy.get('nav').contains('Approvals').click();
    cy.url().should('include', '/approvals');
    cy.screenshot('08-approvals');

    // 9. Gallery
    cy.get('nav').contains('Gallery').click();
    cy.url().should('include', '/gallery');
    cy.screenshot('09-gallery');

    // 10. Settings
    cy.get('nav').contains('Settings').click();
    cy.url().should('include', '/settings');
    cy.screenshot('10-settings');
  });

  it('Verifies RBAC for Regular Member', () => {
    // Login as member
    cy.get('input[name="email"]').type('member@kmaincms.org');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');

    // Check that admin links are missing
    cy.get('nav').should('not.contain', 'Settings');
    cy.get('nav').should('not.contain', 'Approvals');
    cy.get('nav').should('not.contain', 'SMS');

    cy.screenshot('11-member-view');
  });
});
