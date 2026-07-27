module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    budgets: [
      {
        path: '/*.js',
        timings: [
          {
            metric: 'interactive',
            budget: 3800
          },
          {
            metric: 'first-contentful-paint',
            budget: 1800
          },
          {
            metric: 'largest-contentful-paint',
            budget: 2500
          }
        ]
      }
    ]
  },
  passes: [
    {
      passName: 'defaultPass',
      gatherers: [
        'accessibility',
        'seo',
        'performance',
        'best-practices'
      ]
    }
  ],
  audits: [
    'accessibility',
    'performance',
    'best-practices',
    'seo',
    'pwa'
  ],
  categories: {
    performance: {
      weight: 40
    },
    accessibility: {
      weight: 40
    },
    best-practices: {
      weight: 20
    }
  }
}