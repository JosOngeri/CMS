import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Card, Avatar, Chip } from 'react-native-paper';
import { Icon } from 'react-native-vector-icons/MaterialIcons';
import { announcementsAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

const AnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await announcementsAPI.getAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      // Use mock data for now
      setAnnouncements([
        {
          id: 1,
          title: 'Sabbath School Updates',
          content: 'New curriculum materials are now available for all Sabbath School classes.',
          author: 'Sabbath School Department',
          date: '2024-01-15',
          priority: 'normal',
        },
        {
          id: 2,
          title: 'Youth Fellowship Meeting',
          content: 'Join us this Saturday afternoon for our monthly youth fellowship.',
          author: 'Youth Department',
          date: '2024-01-14',
          priority: 'urgent',
        },
        {
          id: 3,
          title: 'Church Board Meeting',
          content: 'Monthly board meeting will be held on Tuesday at 6 PM.',
          author: 'Church Board',
          date: '2024-01-13',
          priority: 'normal',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'important':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader style={[styles.skeletonTitle, { width: 200, height: 24, marginBottom: 8 }]} />
          <SkeletonLoader style={[styles.skeletonSubtitle, { width: 300, height: 16 }]} />
        </View>
        <View style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <SkeletonLoader style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <SkeletonLoader style={{ width: '70%', height: 18, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '50%', height: 14 }} />
                  </View>
                  <SkeletonLoader style={{ width: 60, height: 24, borderRadius: 12 }} />
                </View>
                <SkeletonLoader style={{ width: '100%', height: 40, marginTop: 12 }} />
                <SkeletonLoader style={{ width: 100, height: 14, marginTop: 8 }} />
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (announcements.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSubtitle}>Stay informed with church updates</Text>
        </View>
        <EmptyState
          icon="campaign"
          title="No Announcements"
          message="There are no announcements at the moment. Check back later for updates."
          actionText="Refresh"
          onAction={loadAnnouncements}
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
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerSubtitle}>
          Latest news and updates from SDA Church Kiserian Main
        </Text>
      </View>

      <View style={styles.content}>
        {announcements.map((announcement) => (
          <Card key={announcement.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Avatar.Text
                    size={40}
                    label={announcement.author?.[0] || 'A'}
                    style={styles.avatar}
                  />
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{announcement.title}</Text>
                    <Text style={styles.cardAuthor}>{announcement.author}</Text>
                  </View>
                </View>
                <Chip
                  style={[styles.priorityChip, { backgroundColor: getPriorityColor(announcement.priority) }]}
                  textStyle={styles.priorityChipText}
                >
                  {announcement.priority}
                </Chip>
              </View>
              <Text style={styles.cardContent}>{announcement.content}</Text>
              <Text style={styles.cardDate}>
                {new Date(announcement.date).toLocaleDateString()}
              </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardAuthor: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  priorityChip: {
    height: 24,
  },
  priorityChipText: {
    color: '#ffffff',
    fontSize: 10,
  },
  cardContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default AnnouncementsScreen;
