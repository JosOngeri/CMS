import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/sync_models.dart';

class SyncStorageService {
  static final SyncStorageService _instance = SyncStorageService._internal();
  static Database? _database;
  static const int _databaseVersion = 1;

  factory SyncStorageService() {
    return _instance;
  }

  SyncStorageService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'sync_storage.db');

    return await openDatabase(
      path,
      version: _databaseVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Create user-scoped tables with user_id for isolation
    await db.execute('''
      CREATE TABLE sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        last_sync_sequence TEXT NOT NULL,
        last_sync_time TEXT NOT NULL,
        snapshot_hash TEXT NOT NULL,
        snapshot_size INTEGER NOT NULL,
        UNIQUE(user_id)
      )
    ''');

    await db.execute('''
      CREATE TABLE rolling_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        UNIQUE(user_id, sequence_number)
      )
    ''');

    await db.execute('''
      CREATE TABLE user_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        group_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE user_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE user_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        recipient_email TEXT,
        scheduled_for TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE user_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    // Create indexes for performance
    await db.execute('CREATE INDEX idx_rolling_updates_user_seq ON rolling_updates(user_id, sequence_number)');
    await db.execute('CREATE INDEX idx_user_contacts_user ON user_contacts(user_id)');
    await db.execute('CREATE INDEX idx_user_groups_user ON user_groups(user_id)');
    await db.execute('CREATE INDEX idx_user_messages_user ON user_messages(user_id)');
    await db.execute('CREATE INDEX idx_user_templates_user ON user_templates(user_id)');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle database migrations
    if (oldVersion < 1) {
      // Add migration logic if needed
    }
  }

  Future<String?> _getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user_data');
    if (userData != null) {
      final userMap = jsonDecode(userData);
      return userMap['id']?.toString();
    }
    return null;
  }

  // Store user-specific snapshot with compression
  Future<bool> storeSnapshot(String userId, Map<String, dynamic> snapshotData) async {
    try {
      final db = await database;
      
      // Compress snapshot data
      final jsonData = jsonEncode(snapshotData);
      final compressedData = gzip.encode(utf8.encode(jsonData));
      final dataHash = sha256.convert(utf8.encode(jsonData)).toString();
      
      // Store or update sync metadata
      final metadata = SyncMetadata(
        userId: userId,
        lastSyncSequence: DateTime.now().millisecondsSinceEpoch.toString(),
        lastSyncTime: DateTime.now(),
        snapshotHash: dataHash,
        snapshotSize: compressedData.length,
      );
      
      await db.insert(
        'sync_metadata',
        metadata.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      
      // Store individual data in user-scoped tables
      if (snapshotData['contacts'] != null) {
        for (var contactData in snapshotData['contacts']) {
          final contact = Contact(
            userId: userId,
            name: contactData['name'],
            phone: contactData['phone'],
            email: contactData['email'],
            group: contactData['group'],
            createdAt: DateTime.parse(contactData['created_at']),
            updatedAt: DateTime.parse(contactData['updated_at']),
          );
          await db.insert('user_contacts', contact.toMap());
        }
      }
      
      if (snapshotData['groups'] != null) {
        for (var groupData in snapshotData['groups']) {
          final group = Group(
            userId: userId,
            name: groupData['name'],
            description: groupData['description'],
            createdAt: DateTime.parse(groupData['created_at']),
            updatedAt: DateTime.parse(groupData['updated_at']),
          );
          await db.insert('user_groups', group.toMap());
        }
      }
      
      if (snapshotData['messages'] != null) {
        for (var messageData in snapshotData['messages']) {
          final message = Message(
            userId: userId,
            content: messageData['content'],
            recipientPhone: messageData['recipient_phone'],
            recipientEmail: messageData['recipient_email'],
            scheduledFor: DateTime.parse(messageData['scheduled_for']),
            status: messageData['status'],
            createdAt: DateTime.parse(messageData['created_at']),
            updatedAt: DateTime.parse(messageData['updated_at']),
          );
          await db.insert('user_messages', message.toMap());
        }
      }
      
      if (snapshotData['templates'] != null) {
        for (var templateData in snapshotData['templates']) {
          final template = Template(
            userId: userId,
            name: templateData['name'],
            content: templateData['content'],
            category: templateData['category'],
            createdAt: DateTime.parse(templateData['created_at']),
            updatedAt: DateTime.parse(templateData['updated_at']),
          );
          await db.insert('user_templates', template.toMap());
        }
      }
      
      debugPrint('=== SyncStorage: Snapshot stored successfully for user $userId ===');
      return true;
    } catch (e) {
      debugPrint('=== SyncStorage: Error storing snapshot: $e ===');
      return false;
    }
  }

  // Retrieve user-specific snapshot with decompression
  Future<Map<String, dynamic>?> getSnapshot(String userId) async {
    try {
      final db = await database;
      
      // Get sync metadata
      final metadataResult = await db.query(
        'sync_metadata',
        where: 'user_id = ?',
        whereArgs: [userId],
      );
      
      if (metadataResult.isEmpty) {
        debugPrint('=== SyncStorage: No snapshot found for user $userId ===');
        return null;
      }
      
      // Retrieve user-specific data
      final contactsResult = await db.query(
        'user_contacts',
        where: 'user_id = ?',
        whereArgs: [userId],
      );
      
      final groupsResult = await db.query(
        'user_groups',
        where: 'user_id = ?',
        whereArgs: [userId],
      );
      
      final messagesResult = await db.query(
        'user_messages',
        where: 'user_id = ?',
        whereArgs: [userId],
      );
      
      final templatesResult = await db.query(
        'user_templates',
        where: 'user_id = ?',
        whereArgs: [userId],
      );
      
      final snapshotData = {
        'contacts': contactsResult.map((map) => Contact.fromMap(map).toMap()).toList(),
        'groups': groupsResult.map((map) => Group.fromMap(map).toMap()).toList(),
        'messages': messagesResult.map((map) => Message.fromMap(map).toMap()).toList(),
        'templates': templatesResult.map((map) => Template.fromMap(map).toMap()).toList(),
      };
      
      debugPrint('=== SyncStorage: Snapshot retrieved successfully for user $userId ===');
      return snapshotData;
    } catch (e) {
      debugPrint('=== SyncStorage: Error retrieving snapshot: $e ===');
      return null;
    }
  }

  // Store rolling update with user isolation
  Future<bool> storeRollingUpdate(String userId, RollingUpdate update) async {
    try {
      final db = await database;
      
      await db.insert(
        'rolling_updates',
        update.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      
      debugPrint('=== SyncStorage: Rolling update stored for user $userId ===');
      return true;
    } catch (e) {
      debugPrint('=== SyncStorage: Error storing rolling update: $e ===');
      return false;
    }
  }

  // Get rolling updates since sequence for user
  Future<List<RollingUpdate>> getRollingUpdatesSince(String userId, String sinceSequence) async {
    try {
      final db = await database;
      
      final result = await db.query(
        'rolling_updates',
        where: 'user_id = ? AND sequence_number > ?',
        whereArgs: [userId, int.parse(sinceSequence)],
        orderBy: 'sequence_number ASC',
      );
      
      final updates = result.map((map) => RollingUpdate.fromMap(map)).toList();
      debugPrint('=== SyncStorage: Retrieved ${updates.length} updates for user $userId ===');
      return updates;
    } catch (e) {
      debugPrint('=== SyncStorage: Error getting rolling updates: $e ===');
      return [];
    }
  }

  // Get last sync sequence for user
  Future<String?> getLastSyncSequence(String userId) async {
    try {
      final db = await database;
      
      final result = await db.query(
        'sync_metadata',
        where: 'user_id = ?',
        whereArgs: [userId],
        columns: ['last_sync_sequence'],
      );
      
      if (result.isNotEmpty) {
        return result.first['last_sync_sequence'] as String;
      }
      return null;
    } catch (e) {
      debugPrint('=== SyncStorage: Error getting last sync sequence: $e ===');
      return null;
    }
  }

  // Clear only current user's data
  Future<bool> clearData(String userId) async {
    try {
      final db = await database;
      
      // Delete user-specific data only
      await db.delete('user_contacts', where: 'user_id = ?', whereArgs: [userId]);
      await db.delete('user_groups', where: 'user_id = ?', whereArgs: [userId]);
      await db.delete('user_messages', where: 'user_id = ?', whereArgs: [userId]);
      await db.delete('user_templates', where: 'user_id = ?', whereArgs: [userId]);
      await db.delete('rolling_updates', where: 'user_id = ?', whereArgs: [userId]);
      await db.delete('sync_metadata', where: 'user_id = ?', whereArgs: [userId]);
      
      debugPrint('=== SyncStorage: Data cleared for user $userId ===');
      return true;
    } catch (e) {
      debugPrint('=== SyncStorage: Error clearing data: $e ===');
      return false;
    }
  }

  // Validate data integrity with hash check
  Future<bool> validateDataIntegrity(String userId, String expectedHash) async {
    try {
      final db = await database;
      
      final result = await db.query(
        'sync_metadata',
        where: 'user_id = ?',
        whereArgs: [userId],
        columns: ['snapshot_hash'],
      );
      
      if (result.isNotEmpty) {
        final storedHash = result.first['snapshot_hash'] as String;
        return storedHash == expectedHash;
      }
      return false;
    } catch (e) {
      debugPrint('=== SyncStorage: Error validating data integrity: $e ===');
      return false;
    }
  }

  // Close database connection
  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}