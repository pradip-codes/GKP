import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const rotateY = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 0.8001, 1],
    outputRange: ['0deg', '25deg', '45deg', '70deg', '90deg', '0deg', '0deg'],
  });

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <Animated.Image
        source={require('../assets/images/logo-loader.webp')}
        resizeMode="contain"
        accessibilityLabel="Loading"
        style={[styles.logo, { transform: [{ perspective: 1000 }, { rotateY }] }]}
      />
      <Text style={[styles.loadingText, { color: colors.textMid }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    backfaceVisibility: 'hidden',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
  },
});

export default LoadingState;
