import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Card, Avatar, Button, TextInput, Divider } from 'react-native-paper';
import { Icon } from 'react-native-vector-icons/MaterialIcons';
import { authAPI, profileAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmptyState from '../components/EmptyState';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userData = await authAPI.loadUser();
      setUser(userData.user);
      setFormData({
        first_name: userData.user?.first_name || '',
        last_name: userData.user?.last_name || '',
        email: userData.user?.email || '',
        phone: userData.user?.phone || '',
        address: userData.user?.address || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await profileAPI.updateProfile(formData);
      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      loadProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authAPI.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="account"
          title="Profile Not Found"
          message="Unable to load your profile. Please try refreshing or contact support."
          actionText="Refresh"
          onAction={loadProfile}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={`${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`}
          style={styles.avatar}
        />
        <Text style={styles.userName}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Profile Information</Text>
              <TouchableOpacity onPress={() => setEditing(!editing)}>
                <Icon
                  name={editing ? 'close' : 'edit'}
                  size={24}
                  color="#3b82f6"
                />
              </TouchableOpacity>
            </View>

            {editing ? (
              <>
                <TextInput
                  label="First Name"
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Last Name"
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  label="Phone"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
                <TextInput
                  label="Address"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  mode="outlined"
                  style={styles.input}
                  multiline
                />
                <Button
                  mode="contained"
                  onPress={handleUpdateProfile}
                  style={styles.updateButton}
                >
                  Update Profile
                </Button>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Icon name="person" size={20} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>
                      {user?.first_name} {user?.last_name}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="email" size={20} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="phone" size={20} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="location-on" size={20} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>{user?.address || 'Not provided'}</Text>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Roles</Text>
            <View style={styles.rolesContainer}>
              {user?.roles?.map((role, index) => (
                <View key={index} style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon={() => <Icon name="logout" size={20} color="white" />}
        >
          Logout
        </Button>
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
    padding: 30,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#3b82f6',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  card: {
    marginBottom: 20,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  input: {
    marginBottom: 15,
  },
  updateButton: {
    marginTop: 10,
    backgroundColor: '#3b82f6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  roleBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
});

export default ProfileScreen;
