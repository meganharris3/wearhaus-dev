import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import StepProgressBar from '../../components/StepProgressBar';
import type { CampusInfo } from '../../data/campusDomains';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import WelcomeStep from './steps/WelcomeStep';
import CreateAccountStep from './steps/CreateAccountStep';
import ProfileStep from './steps/ProfileStep';
import InterestsStep from './steps/InterestsStep';
import CampusStep from './steps/CampusStep';
import PermissionsStep from './steps/PermissionsStep';
import ClosetIntroStep from './steps/ClosetIntroStep';

interface OnboardingScreenProps {
  onGoToLogin: () => void;
  startAtStep?: number;
}

export default function OnboardingScreen({ onGoToLogin, startAtStep = 1 }: OnboardingScreenProps) {
  const { profile, signOut, completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(startAtStep);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [schoolEmail, setSchoolEmail] = useState('');
  const [detectedCampus, setDetectedCampus] = useState<CampusInfo | null>(null);
  const [campusJoined, setCampusJoined] = useState(false);

  // If an existing user lands here (startAtStep=3) and already has a complete
  // profile, silently mark onboarding done so they reach the app immediately.
  useEffect(() => {
    if (startAtStep >= 3 && profile?.display_name && profile?.username) {
      completeOnboarding().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() { setCurrentStep((s) => Math.min(s + 1, 7)); }
  function goBack() { setCurrentStep((s) => Math.max(s - 1, 1)); }

  const isAuthenticatedStep = currentStep >= 3;

  // Steps 3-7 share an ivory background so the progress bar needs one too.
  const progressBar = isAuthenticatedStep ? (
    <View style={styles.progressWrap}>
      <StepProgressBar currentStep={currentStep - 2} totalSteps={5} />
    </View>
  ) : null;

  // Utility header shown on steps 3-7: skip link on left, sign-out on right.
  const utilHeader = isAuthenticatedStep ? (
    <View style={styles.utilHeader}>
      <Pressable onPress={() => completeOnboarding().catch(() => {})}>
        <Text style={styles.skipLink}>Skip setup →</Text>
      </Pressable>
      <Pressable onPress={() => signOut()}>
        <Text style={styles.signOutLink}>Sign out</Text>
      </Pressable>
    </View>
  ) : null;

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={goNext} onGoToLogin={onGoToLogin} />;
      case 2:
        return (
          <CreateAccountStep
            onNext={goNext} onBack={goBack}
            name={name} setName={setName}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
          />
        );
      case 3:
        return (
          <ProfileStep
            onNext={goNext} onBack={goBack}
            name={name}
            username={username} setUsername={setUsername}
            localAvatar={localAvatar} setLocalAvatar={setLocalAvatar}
          />
        );
      case 4:
        return (
          <InterestsStep
            onNext={goNext} onBack={goBack}
            interests={interests} setInterests={setInterests}
          />
        );
      case 5:
        return (
          <CampusStep
            onNext={goNext} onBack={goBack}
            schoolEmail={schoolEmail} setSchoolEmail={setSchoolEmail}
            detectedCampus={detectedCampus} setDetectedCampus={setDetectedCampus}
            campusJoined={campusJoined} setCampusJoined={setCampusJoined}
          />
        );
      case 6:
        return <PermissionsStep onNext={goNext} onBack={goBack} />;
      case 7:
        return <ClosetIntroStep onNext={goNext} />;
      default:
        return <WelcomeStep onNext={goNext} onGoToLogin={onGoToLogin} />;
    }
  })();

  if (!isAuthenticatedStep) {
    return <>{stepContent}</>;
  }

  // Steps 3-7: ivory wrapper so progress bar and util header share the background.
  return (
    <View style={styles.authStepRoot}>
      {utilHeader}
      {progressBar}
      <View style={styles.stepFlex}>{stepContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  authStepRoot: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  utilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52, // clears status bar without SafeAreaView (parent has none here)
    paddingBottom: 4,
  },
  skipLink: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
  },
  signOutLink: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
  },
  progressWrap: {
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  stepFlex: {
    flex: 1,
  },
});
