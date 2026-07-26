// Sync data models for Android app with user isolation
class SyncMetadata {
  final int? id;
  final String userId; // User-scoped metadata
  final String lastSyncSequence;
  final DateTime lastSyncTime;
  final String snapshotHash;
  final int snapshotSize;

  SyncMetadata({
    this.id,
    required this.userId,
    required this.lastSyncSequence,
    required this.lastSyncTime,
    required this.snapshotHash,
    required this.snapshotSize,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'last_sync_sequence': lastSyncSequence,
      'last_sync_time': lastSyncTime.toIso8601String(),
      'snapshot_hash': snapshotHash,
      'snapshot_size': snapshotSize,
    };
  }

  factory SyncMetadata.fromMap(Map<String, dynamic> map) {
    return SyncMetadata(
      id: map['id'],
      userId: map['user_id'],
      lastSyncSequence: map['last_sync_sequence'],
      lastSyncTime: DateTime.parse(map['last_sync_time']),
      snapshotHash: map['snapshot_hash'],
      snapshotSize: map['snapshot_size'],
    );
  }
}

class RollingUpdate {
  final int? id;
  final String userId; // User-scoped updates
  final int sequenceNumber;
  final String tableName;
  final String operation; // 'insert', 'update', 'delete'
  final Map<String, dynamic> data;
  final DateTime timestamp;

  RollingUpdate({
    this.id,
    required this.userId,
    required this.sequenceNumber,
    required this.tableName,
    required this.operation,
    required this.data,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'sequence_number': sequenceNumber,
      'table_name': tableName,
      'operation': operation,
      'data': data.toString(),
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory RollingUpdate.fromMap(Map<String, dynamic> map) {
    return RollingUpdate(
      id: map['id'],
      userId: map['user_id'],
      sequenceNumber: map['sequence_number'],
      tableName: map['table_name'],
      operation: map['operation'],
      data: Map<String, dynamic>.from(map['data']),
      timestamp: DateTime.parse(map['timestamp']),
    );
  }
}

class Contact {
  final int? id;
  final String userId; // User-scoped contacts
  final String name;
  final String phone;
  final String? email;
  final String? group;
  final DateTime createdAt;
  final DateTime updatedAt;

  Contact({
    this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.email,
    this.group,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'phone': phone,
      'email': email,
      'group': group,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory Contact.fromMap(Map<String, dynamic> map) {
    return Contact(
      id: map['id'],
      userId: map['user_id'],
      name: map['name'],
      phone: map['phone'],
      email: map['email'],
      group: map['group'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt: DateTime.parse(map['updated_at']),
    );
  }
}

class Group {
  final int? id;
  final String userId; // User-scoped groups
  final String name;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;

  Group({
    this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'description': description,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory Group.fromMap(Map<String, dynamic> map) {
    return Group(
      id: map['id'],
      userId: map['user_id'],
      name: map['name'],
      description: map['description'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt: DateTime.parse(map['updated_at']),
    );
  }
}

class Message {
  final int? id;
  final String userId; // User-scoped messages
  final String content;
  final String recipientPhone;
  final String? recipientEmail;
  final DateTime scheduledFor;
  final String status; // 'pending', 'sent', 'failed'
  final DateTime createdAt;
  final DateTime updatedAt;

  Message({
    this.id,
    required this.userId,
    required this.content,
    required this.recipientPhone,
    this.recipientEmail,
    required this.scheduledFor,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'content': content,
      'recipient_phone': recipientPhone,
      'recipient_email': recipientEmail,
      'scheduled_for': scheduledFor.toIso8601String(),
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory Message.fromMap(Map<String, dynamic> map) {
    return Message(
      id: map['id'],
      userId: map['user_id'],
      content: map['content'],
      recipientPhone: map['recipient_phone'],
      recipientEmail: map['recipient_email'],
      scheduledFor: DateTime.parse(map['scheduled_for']),
      status: map['status'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt: DateTime.parse(map['updated_at']),
    );
  }
}

class Template {
  final int? id;
  final String userId; // User-scoped templates
  final String name;
  final String content;
  final String? category;
  final DateTime createdAt;
  final DateTime updatedAt;

  Template({
    this.id,
    required this.userId,
    required this.name,
    required this.content,
    this.category,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'content': content,
      'category': category,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory Template.fromMap(Map<String, dynamic> map) {
    return Template(
      id: map['id'],
      userId: map['user_id'],
      name: map['name'],
      content: map['content'],
      category: map['category'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt: DateTime.parse(map['updated_at']),
    );
  }
}