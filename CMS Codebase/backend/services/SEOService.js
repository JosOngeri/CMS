/**
 * SEO Service
 * Handles SEO analysis and validation logic
 */
class SEOService {
  /**
   * Analyze SEO content and return issues/recommendations
   * @param {Object} seoData - SEO data to analyze
   * @param {string} [seoData.metaTitle] - Meta title to analyze
   * @param {string} [seoData.metaDescription] - Meta description to analyze
   * @param {Array} [seoData.keywords] - Keywords to analyze
   * @returns {Object} Analysis result with issues array
   */
  analyzeSEO(seoData) {
    const { metaTitle, metaDescription, keywords } = seoData;
    const issues = [];

    // Analyze meta title
    if (!metaTitle) {
      issues.push({
        severity: 'error',
        title: 'Meta Title Missing',
        description: 'Meta title is required for better SEO'
      });
    } else if (metaTitle.length < 30) {
      issues.push({
        severity: 'warning',
        title: 'Meta Title Too Short',
        description: 'Meta title should be at least 30 characters for better SEO'
      });
    } else if (metaTitle.length > 60) {
      issues.push({
        severity: 'warning',
        title: 'Meta Title Too Long',
        description: 'Meta title should be under 60 characters to avoid truncation in search results'
      });
    } else {
      issues.push({
        severity: 'success',
        title: 'Meta Title Optimal',
        description: 'Meta title length is optimal for search engines'
      });
    }

    // Analyze meta description
    if (!metaDescription) {
      issues.push({
        severity: 'error',
        title: 'Meta Description Missing',
        description: 'Meta description is required for better SEO'
      });
    } else if (metaDescription.length < 120) {
      issues.push({
        severity: 'warning',
        title: 'Meta Description Too Short',
        description: 'Meta description should be at least 120 characters for better SEO'
      });
    } else if (metaDescription.length > 160) {
      issues.push({
        severity: 'warning',
        title: 'Meta Description Too Long',
        description: 'Meta description should be under 160 characters to avoid truncation'
      });
    } else {
      issues.push({
        severity: 'success',
        title: 'Meta Description Optimal',
        description: 'Meta description length is optimal for search engines'
      });
    }

    // Analyze keywords
    if (!keywords || keywords.length === 0) {
      issues.push({
        severity: 'error',
        title: 'No Keywords Defined',
        description: 'Add relevant keywords to improve search engine visibility'
      });
    } else if (keywords.length < 3) {
      issues.push({
        severity: 'warning',
        title: 'Few Keywords',
        description: 'Consider adding more keywords (3-5 recommended) for better SEO'
      });
    } else {
      issues.push({
        severity: 'success',
        title: 'Keywords Defined',
        description: `${keywords.length} keywords defined for SEO optimization`
      });
    }

    // Check if keywords are present in title and description
    if (keywords && keywords.length > 0 && metaTitle && metaDescription) {
      const titleLower = metaTitle.toLowerCase();
      const descLower = metaDescription.toLowerCase();
      
      keywords.forEach((keyword, index) => {
        const keywordLower = keyword.toLowerCase();
        const inTitle = titleLower.includes(keywordLower);
        const inDesc = descLower.includes(keywordLower);
        
        if (!inTitle && !inDesc) {
          issues.push({
            severity: 'warning',
            title: `Keyword Not Used: "${keyword}"`,
            description: `This keyword is not found in the meta title or description`
          });
        }
      });
    }

    return { issues };
  }

  /**
   * Calculate SEO score based on analysis
   * @param {Array} issues - Issues from analysis
   * @returns {number} SEO score (0-100)
   */
  calculateScore(issues) {
    let score = 100;
    
    issues.forEach(issue => {
      if (issue.severity === 'error') {
        score -= 20;
      } else if (issue.severity === 'warning') {
        score -= 10;
      }
    });

    return Math.max(0, score);
  }
}

module.exports = new SEOService();
