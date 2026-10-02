const BaseRepository = require('./BaseRepository');

class DepartmentLeadershipRepository extends BaseRepository {
  constructor() {
    super('departments');
  }
}

module.exports = new DepartmentLeadershipRepository();
