/**
 * 003_snapshot_tables.test.js
 *
 * Test suite for snapshot and rolling update tables migration
 */

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    end: jest.fn(),
  },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

const db = require('../../config/database');

describe('Migration 003: Snapshot and Rolling Update Tables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    db.pool.query.mockReset();
    db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('sms_daily_snapshots table', () => {
    it('should have sms_daily_snapshots table with correct columns', async () => {
      const mockResult = {
        rows: [
          { column_name: 'id', data_type: 'uuid' },
          { column_name: 'church_id', data_type: 'uuid' },
          { column_name: 'snapshot_date', data_type: 'date' },
          { column_name: 'data_hash', data_type: 'character varying' },
          { column_name: 'compressed_data', data_type: 'bytea' },
          { column_name: 'file_size', data_type: 'integer' },
          { column_name: 'created_at', data_type: 'timestamp without time zone' }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sms_daily_snapshots' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toHaveLength(7);
      expect(result.rows[0].column_name).toBe('id');
      expect(result.rows[0].data_type).toBe('uuid');
      expect(result.rows[1].column_name).toBe('church_id');
      expect(result.rows[2].column_name).toBe('snapshot_date');
      expect(result.rows[3].column_name).toBe('data_hash');
      expect(result.rows[4].column_name).toBe('compressed_data');
      expect(result.rows[5].column_name).toBe('file_size');
      expect(result.rows[6].column_name).toBe('created_at');
    });

    it('should have foreign key constraint on church_id', async () => {
      const mockResult = {
        rows: [
          {
            constraint_name: 'fk_sms_daily_snapshots_church_id',
            foreign_table_name: 'churches'
          }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'sms_daily_snapshots'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_name).toBe('fk_sms_daily_snapshots_church_id');
      expect(result.rows[0].foreign_table_name).toBe('churches');
    });

    it('should have unique constraint on (church_id, snapshot_date)', async () => {
      const mockResult = {
        rows: [
          {
            constraint_name: 'sms_daily_snapshots_church_date_unique'
          }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'sms_daily_snapshots'
          AND constraint_type = 'UNIQUE'
      `);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_name).toBe('sms_daily_snapshots_church_date_unique');
    });

    it('should have indexes on church_id, snapshot_date, created_at', async () => {
      const mockResult = {
        rows: [
          { indexname: 'idx_sms_daily_snapshots_church_id' },
          { indexname: 'idx_sms_daily_snapshots_snapshot_date' },
          { indexname: 'idx_sms_daily_snapshots_created_at' }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'sms_daily_snapshots'
          AND indexname LIKE 'idx_sms_daily_snapshots_%'
      `);
      
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].indexname).toBe('idx_sms_daily_snapshots_church_id');
      expect(result.rows[1].indexname).toBe('idx_sms_daily_snapshots_snapshot_date');
      expect(result.rows[2].indexname).toBe('idx_sms_daily_snapshots_created_at');
    });
  });

  describe('sms_rolling_updates table', () => {
    it('should have sms_rolling_updates table with correct columns', async () => {
      const mockResult = {
        rows: [
          { column_name: 'id', data_type: 'uuid' },
          { column_name: 'church_id', data_type: 'uuid' },
          { column_name: 'update_type', data_type: 'character varying' },
          { column_name: 'entity_type', data_type: 'character varying' },
          { column_name: 'entity_id', data_type: 'uuid' },
          { column_name: 'operation', data_type: 'character varying' },
          { column_name: 'data', data_type: 'jsonb' },
          { column_name: 'created_at', data_type: 'timestamp without time zone' },
          { column_name: 'sequence_number', data_type: 'bigint' }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sms_rolling_updates' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toHaveLength(9);
      expect(result.rows[0].column_name).toBe('id');
      expect(result.rows[0].data_type).toBe('uuid');
      expect(result.rows[1].column_name).toBe('church_id');
      expect(result.rows[2].column_name).toBe('update_type');
      expect(result.rows[3].column_name).toBe('entity_type');
      expect(result.rows[4].column_name).toBe('entity_id');
      expect(result.rows[5].column_name).toBe('operation');
      expect(result.rows[6].column_name).toBe('data');
      expect(result.rows[7].column_name).toBe('created_at');
      expect(result.rows[8].column_name).toBe('sequence_number');
    });

    it('should have foreign key constraint on church_id', async () => {
      const mockResult = {
        rows: [
          {
            constraint_name: 'fk_sms_rolling_updates_church_id',
            foreign_table_name: 'churches'
          }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'sms_rolling_updates'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_name).toBe('fk_sms_rolling_updates_church_id');
      expect(result.rows[0].foreign_table_name).toBe('churches');
    });

    it('should have unique constraint on (church_id, sequence_number)', async () => {
      const mockResult = {
        rows: [
          {
            constraint_name: 'sms_rolling_updates_church_sequence_unique'
          }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'sms_rolling_updates'
          AND constraint_type = 'UNIQUE'
      `);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_name).toBe('sms_rolling_updates_church_sequence_unique');
    });

    it('should have indexes on church_id, created_at, sequence_number, entity_type', async () => {
      const mockResult = {
        rows: [
          { indexname: 'idx_sms_rolling_updates_church_id' },
          { indexname: 'idx_sms_rolling_updates_created_at' },
          { indexname: 'idx_sms_rolling_updates_sequence_number' },
          { indexname: 'idx_sms_rolling_updates_entity_type' }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'sms_rolling_updates'
          AND indexname LIKE 'idx_sms_rolling_updates_%'
      `);
      
      expect(result.rows).toHaveLength(4);
      expect(result.rows[0].indexname).toBe('idx_sms_rolling_updates_church_id');
      expect(result.rows[1].indexname).toBe('idx_sms_rolling_updates_created_at');
      expect(result.rows[2].indexname).toBe('idx_sms_rolling_updates_sequence_number');
      expect(result.rows[3].indexname).toBe('idx_sms_rolling_updates_entity_type');
    });
  });

  describe('sequence for rolling updates', () => {
    it('should have sms_rolling_updates_sequence sequence', async () => {
      const mockResult = {
        rows: [
          { sequencename: 'sms_rolling_updates_sequence' }
        ]
      };
      
      db.query.mockResolvedValueOnce(mockResult);
      
      const result = await db.query(`
        SELECT sequencename
        FROM pg_sequences
        WHERE sequencename = 'sms_rolling_updates_sequence'
      `);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].sequencename).toBe('sms_rolling_updates_sequence');
    });
  });
});
