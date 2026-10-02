const BaseRepository = require('./BaseRepository');

class DepartmentCommunityRepository extends BaseRepository {
  constructor() {
    super('departments');
  }
}

module.exports = new DepartmentCommunityRepository();
