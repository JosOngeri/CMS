import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonLoader = ({ style }) => {
  return <View style={[styles.skeleton, style]} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
});

export default SkeletonLoader;
