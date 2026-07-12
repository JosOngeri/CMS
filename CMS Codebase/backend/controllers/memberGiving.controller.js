const MemberGivingRepository = require('../repositories/MemberGivingRepository');
const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Member Giving Controller
 * Handles member giving tracking and analytics
 */
class MemberGivingController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('MemberGivingController');
  }

  async getMemberGivingHistory(req, res) {
    try {
      const { member_id, start_date, end_date, category_id } = req.query;

      const data = await MemberGivingRepository.getMemberGivingHistory({
        member_id,
        start_date,
        end_date,
        category_id
      });

      this.success(res, { data });
    } catch (error) {
      this.logger.error('getMemberGivingHistory', error);
      this.error(res, 'Failed to fetch member giving history');
    }
  }

  async getMemberGivingSummary(req, res) {
    try {
      const { member_id, year } = req.query;

      const targetYear = year || new Date().getFullYear();
      const data = await MemberGivingRepository.getMemberGivingSummary(member_id, targetYear);

      this.success(res, { data, year: targetYear });
    } catch (error) {
      this.logger.error('getMemberGivingSummary', error);
      this.error(res, 'Failed to fetch member giving summary');
    }
  }

  async getMemberGivingTrends(req, res) {
    try {
      const { member_id, period = 'monthly', year } = req.query;

      const targetYear = year || new Date().getFullYear();
      const data = await MemberGivingRepository.getMemberGivingTrends(member_id, period, targetYear);

      this.success(res, { data, year: targetYear, period });
    } catch (error) {
      this.logger.error('getMemberGivingTrends', error);
      this.error(res, 'Failed to fetch member giving trends');
    }
  }

  async getTopGivers(req, res) {
    try {
      const { limit = 10, year, category_id } = req.query;

      const targetYear = year || new Date().getFullYear();
      const data = await MemberGivingRepository.getTopGivers(limit, targetYear, category_id);

      this.success(res, { data, year: targetYear });
    } catch (error) {
      this.logger.error('getTopGivers', error);
      this.error(res, 'Failed to fetch top givers');
    }
  }

  async getMemberGivingComparison(req, res) {
    try {
      const { member_id, year } = req.query;

      const currentYear = year || new Date().getFullYear();
      const previousYear = currentYear - 1;

      const rows = await MemberGivingRepository.getMemberGivingComparison(member_id, currentYear, previousYear);

      const comparison = {};
      rows.forEach(row => {
        if (!comparison[row.category_name]) {
          comparison[row.category_name] = {};
        }
        comparison[row.category_name][row.year] = parseFloat(row.total_amount);
      });

      this.success(res, { data: comparison, currentYear, previousYear });
    } catch (error) {
      this.logger.error('getMemberGivingComparison', error);
      this.error(res, 'Failed to fetch member giving comparison');
    }
  }

  async getGivingByDepartment(req, res) {
    try {
      const { year } = req.query;

      const targetYear = year || new Date().getFullYear();
      const data = await MemberGivingRepository.getGivingByDepartment(targetYear);

      this.success(res, { data, year: targetYear });
    } catch (error) {
      this.logger.error('getGivingByDepartment', error);
      this.error(res, 'Failed to fetch giving by department');
    }
  }
}

module.exports = new MemberGivingController();
