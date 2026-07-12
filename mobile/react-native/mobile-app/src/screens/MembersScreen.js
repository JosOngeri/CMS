import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Card, Avatar, Searchbar } from 'react-native-paper';
import { Icon } from 'react-native-vector-icons/MaterialIcons';
import { membersAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

const MembersScreen = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter(
        (member) =>
          member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockMembers = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+254 712 345 678',
          department: 'Sabbath School',
          status: 'active',
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+254 723 456 789',
          department: 'Music Ministry',
          status: 'active',
        },
        {
          id: 3,
          first_name: 'Michael',
          last_name: 'Johnson',
          email: 'michael.j@example.com',
          phone: '+254 734 567 890',
          department: 'Youth Ministry',
          status: 'active',
        },
        {
          id: 4,
          first_name: 'Sarah',
          last_name: 'Williams',
          email: 'sarah.w@example.com',
          phone: '+254 745 678 901',
          department: 'Women\'s Ministry',
          status: 'active',
        },
        {
          id: 5,
          first_name: 'David',
          last_name: 'Brown',
          email: 'david.b@example.com',
          phone: '+254 756 789 012',
          department: 'Deacons',
          status: 'inactive',
        },
      ];
      setMembers(mockMembers);
      setFilteredMembers(mockMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'inactive':
        return '#9ca3af';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader style={[styles.skeletonTitle, { width: 150, height: 24, marginBottom: 8 }]} />
          <SkeletonLoader style={[styles.skeletonSubtitle, { width: 250, height: 16 }]} />
        </View>
        <View style={styles.searchContainer}>
          <SkeletonLoader style={{ width: '100%', height: 48, borderRadius: 24 }} />
        </View>
        <View style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <SkeletonLoader style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <SkeletonLoader style={{ width: '60%', height: 18, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '40%', height: 14 }} />
                  </View>
                </View>
                <View style={styles.contactInfo}>
                  <SkeletonLoader style={{ width: '80%', height: 14, marginBottom: 8 }} />
                  <SkeletonLoader style={{ width: '60%', height: 14 }} />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (filteredMembers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Members</Text>
          <Text style={styles.headerSubtitle}>Church member directory</Text>
        </View>
        <EmptyState
          icon="people"
          title={searchQuery ? 'No Members Found' : 'No Members'}
          message={searchQuery ? 'No members match your search. Try a different search term.' : 'There are no members in the directory at the moment.'}
          actionText="Refresh"
          onAction={loadMembers}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        <Text style={styles.headerSubtitle}>
          Church member directory
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search members..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      <View style={styles.content}>
        {filteredMembers.map((member) => (
          <Card key={member.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Avatar.Text
                  size={50}
                  label={`${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`}
                  style={styles.avatar}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.memberName}>
                    {member.first_name} {member.last_name}
                  </Text>
                  <Text style={styles.memberDepartment}>{member.department}</Text>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(member.status) },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                      {member.status}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Icon name="email" size={16} color="#6b7280" />
                  <Text style={styles.contactText}>{member.email}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Icon name="phone" size={16} color="#6b7280" />
                  <Text style={styles.contactText}>{member.phone}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
  },
  card: {
    marginBottom: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  memberDepartment: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default MembersScreen;
