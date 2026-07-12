import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-vector-icons/MaterialIcons';

const EmptyState = ({ icon, title, message, actionText, onAction }) => {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color="#9ca3af" style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionText && onAction && (
        <Text style={styles.action} onPress={onAction}>
          {actionText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  action: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default EmptyState;
