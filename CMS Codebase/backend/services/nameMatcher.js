/**
 * Name Matcher Service (Phase 12)
 * Fuzzy name matching for financial reconciliation
 * Uses Levenshtein distance and other algorithms for name similarity
 */

class NameMatcher {
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  static levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // Create matrix
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,      // deletion
            dp[i][j - 1] + 1,      // insertion
            dp[i - 1][j - 1] + 1     // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * Calculate similarity score between two names (0-1)
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} Similarity score (0 = no match, 1 = exact match)
   */
  static calculateSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    if (name1.toLowerCase() === name2.toLowerCase()) return 1;
    
    const str1 = name1.toLowerCase().trim();
    const str2 = name2.toLowerCase().trim();
    
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 0;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Check if two names are similar enough for matching
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @param {number} threshold - Minimum similarity threshold (default: 0.7)
   * @returns {boolean} True if names are similar enough
   */
  static isSimilar(name1, name2, threshold = 0.7) {
    return this.calculateSimilarity(name1, name2) >= threshold;
  }

  /**
   * Extract first name from full name
   * @param {string} fullName - Full name
   * @returns {string} First name
   */
  static extractFirstName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || '';
  }

  /**
   * Extract last name from full name
   * @param {string} fullName - Full name
   * @returns {string} Last name
   */
  static extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Match a sender name against a list of member names
   * @param {string} senderName - Name from payment sender
   * @param {Array} memberNames - Array of member names to match against
   * @param {number} threshold - Minimum similarity threshold
   * @returns {Array} Array of matches with similarity scores
   */
  static findMatches(senderName, memberNames, threshold = 0.7) {
    if (!senderName || !memberNames || memberNames.length === 0) {
      return [];
    }
    
    const matches = [];
    
    memberNames.forEach(member => {
      const similarity = this.calculateSimilarity(senderName, member);
      
      if (similarity >= threshold) {
        matches.push({
          name: member,
          similarity: similarity,
          confidence: this.getConfidenceLevel(similarity)
        });
      }
    });
    
    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);
    
    return matches;
  }

  /**
   * Get confidence level based on similarity score
   * @param {number} similarity - Similarity score (0-1)
   * @returns {string} Confidence level
   */
  static getConfidenceLevel(similarity) {
    if (similarity >= 0.95) return 'very_high';
    if (similarity >= 0.85) return 'high';
    if (similarity >= 0.75) return 'medium';
    if (similarity >= 0.65) return 'low';
    return 'very_low';
  }

  /**
   * Normalize name for better matching
   * @param {string} name - Name to normalize
   * @returns {string} Normalized name
   */
  static normalizeName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Check if names might be the same person (considers first name + last name)
   * @param {string} name1 - First full name
   * @param {string} name2 - Second full name
   * @returns {number} Combined similarity score
   */
  static compareFullNames(name1, name2) {
    const firstName1 = this.extractFirstName(name1);
    const lastName1 = this.extractLastName(name1);
    const firstName2 = this.extractFirstName(name2);
    const lastName2 = this.extractLastName(name2);
    
    let score = 0;
    let weight = 0;
    
    // Compare first names
    if (firstName1 && firstName2) {
      const firstSimilarity = this.calculateSimilarity(firstName1, firstName2);
      score += firstSimilarity * 0.4; // First name 40% weight
      weight += 0.4;
    }
    
    // Compare last names
    if (lastName1 && lastName2) {
      const lastSimilarity = this.calculateSimilarity(lastName1, lastName2);
      score += lastSimilarity * 0.6; // Last name 60% weight
      weight += 0.6;
    }
    
    // If we couldn't compare both parts, fall back to full name comparison
    if (weight === 0) {
      return this.calculateSimilarity(name1, name2);
    }
    
    return score / weight;
  }

  /**
   * Find best match from member list for a given sender name
   * @param {string} senderName - Name from payment
   * @param {Array} members - Array of member objects with names
   * @param {number} threshold - Minimum similarity threshold
   * @returns {object|null} Best match or null if no match found
   */
  static findBestMatch(senderName, members, threshold = 0.7) {
    if (!senderName || !members || members.length === 0) {
      return null;
    }
    
    let bestMatch = null;
    let bestScore = 0;
    
    members.forEach(member => {
      const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
      const score = this.compareFullNames(senderName, memberName);
      
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = {
          ...member,
          similarity: score,
          confidence: this.getConfidenceLevel(score)
        };
      }
    });
    
    return bestMatch;
  }

  /**
   * Check if name contains common variations/abbreviations
   * @param {string} name - Name to check
   * @returns {object} Normalized name with variations
   */
  static expandNameVariations(name) {
    if (!name) return { original: name, variations: [] };
    
    const variations = [name];
    const lowerName = name.toLowerCase();
    
    // Common name variations
    const commonVariations = {
      'john': ['jon', 'jonathan', 'johnny', 'jack'],
      'james': ['jim', 'jimmy', 'jamie'],
      'robert': ['bob', 'rob', 'bobby'],
      'william': ['will', 'bill', 'billy'],
      'elizabeth': ['liz', 'beth', 'eliza', 'betty'],
      'margaret': ['maggie', 'meg', 'peggy'],
      'alexander': ['alex', 'xander'],
      'christopher': ['chris'],
      'joseph': ['joe', 'joey'],
      'thomas': ['tom', 'tommy'],
      'richard': ['rick', 'dick'],
      'charles': ['charlie', 'chuck'],
      'david': ['dave', 'davey'],
      'michael': ['mike', 'mikey'],
      'daniel': ['dan', 'danny'],
      'matthew': ['matt'],
      'stephen': ['steve', 'steven'],
      'brian': ['bryan'],
      'kevin': ['kev'],
      'jason': ['jay'],
      'justin': ['justin'],
      'brandon': ['brandon'],
      'ryan': ['ryan'],
      'eric': ['eric'],
      'adam': ['adam'],
      'nicholas': ['nick', 'nic'],
      'anthony': ['tony'],
      'paul': ['paul'],
      'mark': ['mark'],
      'donald': ['don'],
      'kenneth': ['ken'],
      'steven': ['steve'],
      'brian': ['brian'],
      'ronald': ['ron'],
      'timothy': ['tim'],
      'jason': ['jay'],
      'jeffrey': ['jeff'],
      'ryan': ['ryan'],
      'jacob': ['jake'],
      'gary': ['gary'],
      'nicholas': ['nick'],
      'stephen': ['steve'],
      'joseph': ['joe'],
      'robert': ['rob'],
      'william': ['will', 'bill'],
      'richard': ['rick'],
      'charles': ['charlie'],
      'daniel': ['dan'],
      'matthew': ['matt'],
      'anthony': ['tony'],
      'paul': ['paul'],
      'mark': ['mark'],
      'donald': ['don'],
      'kenneth': ['ken'],
      'timothy': ['tim'],
      'jason': ['jay'],
      'jeffrey': ['jeff'],
      'ryan': ['ryan'],
      'jacob': ['jake'],
      'gary': ['gary'],
    };
    
    // Check for common variations
    Object.entries(commonVariations).forEach(([key, variants]) => {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        variations.push(...variants);
      }
    });
    
    return {
      original: name,
      variations: [...new Set(variations)] // Remove duplicates
    };
  }
}

module.exports = NameMatcher;