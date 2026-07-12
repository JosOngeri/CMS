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
import { eventsAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

const EventsScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      setEvents([
        {
          id: 1,
          title: 'Sabbath Service',
          description: 'Weekly Sabbath worship service',
          date: '2024-01-20',
          time: '09:00',
          location: 'Main Sanctuary',
          category: 'Service',
        },
        {
          id: 2,
          title: 'Youth Fellowship',
          description: 'Monthly youth meeting and fellowship',
          date: '2024-01-20',
          time: '14:00',
          location: 'Youth Hall',
          category: 'Youth',
        },
        {
          id: 3,
          title: 'Prayer Meeting',
          description: 'Mid-week prayer and Bible study',
          date: '2024-01-17',
          time: '18:00',
          location: 'Main Sanctuary',
          category: 'Prayer',
        },
        {
          id: 4,
          title: 'Church Board Meeting',
          description: 'Monthly church business meeting',
          date: '2024-01-16',
          time: '18:00',
          location: 'Board Room',
          category: 'Meeting',
        },
        {
          id: 5,
          title: 'Pathfinder Meeting',
          description: 'Weekly Pathfinder club meeting',
          date: '2024-01-13',
          time: '15:00',
          location: 'Pathfinder Hall',
          category: 'Youth',
        },
      ]);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Service':
        return '#3b82f6';
      case 'Youth':
        return '#8b5cf6';
      case 'Prayer':
        return '#22c55e';
      case 'Meeting':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader style={[styles.skeletonTitle, { width: 150, height: 24, marginBottom: 8 }]} />
          <SkeletonLoader style={[styles.skeletonSubtitle, { width: 300, height: 16 }]} />
        </View>
        <View style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <SkeletonLoader style={[styles.dateBadge, { width: 60, height: 60, borderRadius: 8, marginRight: 12 }]} />
                  <View style={{ flex: 1 }}>
                    <SkeletonLoader style={{ width: '80%', height: 18, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '60%', height: 14, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '40%', height: 14 }} />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>Upcoming events at SDA Church Kiserian Main</Text>
        </View>
        <EmptyState
          icon="event"
          title="No Events"
          message="There are no upcoming events at the moment. Check back later for new events."
          actionText="Refresh"
          onAction={loadEvents}
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
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>
          Upcoming events at SDA Church Kiserian Main
        </Text>
      </View>

      <View style={styles.content}>
        {events.map((event) => (
          <Card key={event.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.dateBadge, { backgroundColor: getCategoryColor(event.category) }]}>
                    <Text style={styles.dateDay}>
                      {new Date(event.date).getDate()}
                    </Text>
                    <Text style={styles.dateMonth}>
                      {new Date(event.date).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{event.title}</Text>
                    <Text style={styles.cardDescription}>{event.description}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <Icon name="schedule" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{event.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="location-on" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{event.location}</Text>
                </View>
              </View>
              
              <Chip
                style={[styles.categoryChip, { backgroundColor: getCategoryColor(event.category) }]}
                textStyle={styles.categoryChipText}
              >
                {event.category}
              </Chip>
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
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  dateBadge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dateMonth: {
    fontSize: 10,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    height: 24,
  },
  categoryChipText: {
    color: '#ffffff',
    fontSize: 10,
  },
});

export default EventsScreen;
