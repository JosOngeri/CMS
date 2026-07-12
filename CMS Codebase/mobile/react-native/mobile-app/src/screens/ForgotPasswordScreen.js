import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { authAPI } from '../services/api';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.requestPasswordReset(email);
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        result.message || 'If an account with this email exists, a password reset link has been sent.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>SDA Church Kiserian Main</Text>
        </View>

        {!emailSent ? (
          <View style={styles.form}>
            <Text style={styles.instruction}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Button
              mode="contained"
              onPress={handleRequestReset}
              loading={loading}
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                Check your email for the password reset link. The link will expire in 1 hour.
              </Text>
            </View>

            <Button
              mode="outlined"
              onPress={() => setEmailSent(false)}
              style={styles.resendButton}
            >
              Send Another Email
            </Button>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefdfb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  instruction: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    marginBottom: 15,
  },
  submitButton: {
    padding: 5,
    marginTop: 10,
    backgroundColor: '#3b82f6',
  },
  successContainer: {
    alignItems: 'center',
    padding: 30,
  },
  successIcon: {
    fontSize: 64,
    color: '#22c55e',
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  link: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
