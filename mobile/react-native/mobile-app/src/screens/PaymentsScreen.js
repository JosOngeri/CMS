import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { Icon } from 'react-native-vector-icons/MaterialIcons';
import { paymentsAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

const PaymentsScreen = ({ navigation }) => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const loadPaymentsData = async () => {
    try {
      setLoading(true);
      const [historyData, categoriesData] = await Promise.all([
        paymentsAPI.getPaymentHistory(),
        paymentsAPI.getPaymentCategories(),
      ]);
      setPaymentHistory(historyData.payments || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Failed to load payments data:', error);
      // Use mock data for now
      setPaymentHistory([
        {
          id: 1,
          amount: 5000,
          category: 'Tithe',
          description: 'Monthly tithe',
          date: '2024-01-15',
          status: 'completed',
        },
        {
          id: 2,
          amount: 2000,
          category: 'Offering',
          description: 'Sabbath offering',
          date: '2024-01-14',
          status: 'completed',
        },
        {
          id: 3,
          amount: 1000,
          category: 'Building Fund',
          description: 'Church building contribution',
          date: '2024-01-13',
          status: 'pending',
        },
      ]);
      setCategories(['Tithe', 'Offering', 'Building Fund', 'Mission', 'Education']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentsData();
  };

  const handleMakePayment = async () => {
    if (!paymentData.amount || !paymentData.category) {
      Alert.alert('Error', 'Please fill in amount and category');
      return;
    }

    try {
      await paymentsAPI.makePayment(paymentData);
      Alert.alert('Success', 'Payment made successfully');
      setShowPaymentForm(false);
      setPaymentData({ amount: '', category: '', description: '' });
      loadPaymentsData();
    } catch (error) {
      Alert.alert('Error', 'Failed to make payment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
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
        <View style={styles.summaryCard}>
          <SkeletonLoader style={{ width: 120, height: 32, marginBottom: 16 }} />
          <SkeletonLoader style={{ width: 80, height: 16 }} />
        </View>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <SkeletonLoader style={{ width: 60, height: 60, borderRadius: 30, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <SkeletonLoader style={{ width: '50%', height: 18, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '40%', height: 14 }} />
                  </View>
                  <SkeletonLoader style={{ width: 60, height: 24, borderRadius: 12 }} />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (paymentHistory.length === 0 && !showPaymentForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payments</Text>
          <Text style={styles.headerSubtitle}>Manage your offerings and tithes</Text>
        </View>
        <EmptyState
          icon="credit-card"
          title="No Payment History"
          message="You haven't made any payments yet. Make your first payment to get started."
          actionText="Make Payment"
          onAction={() => setShowPaymentForm(true)}
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
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerSubtitle}>
          Manage your tithes and offerings
        </Text>
      </View>

      <View style={styles.content}>
        {!showPaymentForm ? (
          <>
            <Button
              mode="contained"
              onPress={() => setShowPaymentForm(true)}
              style={styles.makePaymentButton}
              icon={() => <Icon name="add" size={20} color="white" />}
            >
              Make Payment
            </Button>

            <Text style={styles.sectionTitle}>Payment History</Text>
            {paymentHistory.map((payment) => (
              <Card key={payment.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.statusIcon, { backgroundColor: getStatusColor(payment.status) }]}>
                        <Icon name="payments" size={24} color="white" />
                      </View>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>{payment.category}</Text>
                        <Text style={styles.cardDescription}>{payment.description}</Text>
                      </View>
                    </View>
                    <View style={styles.cardAmountContainer}>
                      <Text style={styles.cardAmount}>KES {payment.amount.toLocaleString()}</Text>
                      <Text style={[styles.cardStatus, { color: getStatusColor(payment.status) }]}>
                        {payment.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>
                    {new Date(payment.date).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.formCard}>
            <Card.Content>
              <Text style={styles.formTitle}>Make Payment</Text>
              <TextInput
                label="Amount"
                value={paymentData.amount}
                onChangeText={(text) => setPaymentData({ ...paymentData, amount: text })}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Category"
                value={paymentData.category}
                onChangeText={(text) => setPaymentData({ ...paymentData, category: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={paymentData.description}
                onChangeText={(text) => setPaymentData({ ...paymentData, description: text })}
                mode="outlined"
                style={styles.input}
                multiline
              />
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setShowPaymentForm(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleMakePayment}
                  style={styles.submitButton}
                >
                  Submit Payment
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
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
  makePaymentButton: {
    marginBottom: 20,
    backgroundColor: '#22c55e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
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
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardAmountContainer: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#22c55e',
  },
});

export default PaymentsScreen;
