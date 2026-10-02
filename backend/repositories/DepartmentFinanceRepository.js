const BaseRepository = require('./BaseRepository');

class DepartmentFinanceRepository extends BaseRepository {
  constructor() {
    super('departments');
  }
}

module.exports = new DepartmentFinanceRepository();
