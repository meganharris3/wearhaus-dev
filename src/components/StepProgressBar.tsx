import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface StepProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export default function StepProgressBar({ currentStep, totalSteps = 4 }: StepProgressBarProps) {
  const pct = (currentStep / totalSteps) * 100;
  const done = currentStep === totalSteps;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={[styles.label, done && styles.labelDone]}>
        {done ? 'All done!' : `Step ${currentStep} of ${totalSteps}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  track: {
    height: 3,
    backgroundColor: theme.colors.ivoryMid,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.yellowBorder,
    borderRadius: 2,
  },
  label: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginTop: 4,
  },
  labelDone: {
    color: theme.colors.yellowBorder,
  },
});
