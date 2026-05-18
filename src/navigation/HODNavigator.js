// src/navigation/HODNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HODDashboardScreen from '../screens/hod/HODDashboardScreen';
import HODReviewSubmissionScreen from '../screens/hod/HODReviewSubmissionScreen';
import {
  HODSubmissionsScreen,
  HODAssignmentsScreen,
  HODNotificationsScreen,
  HODProfileScreen,
} from '../screens/hod/HODExtraScreens';
import {
  HODAssignInternalEvaluatorScreen,
  HODProposeExternalScreen,
} from '../screens/hod/HODWorkflowScreens';

const Stack = createNativeStackNavigator();

export default function HODNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />
      <Stack.Screen name="HODSubmissionsList" component={HODSubmissionsScreen} />
      <Stack.Screen name="HODSubmissions" component={HODSubmissionsScreen} />
      <Stack.Screen name="HODAssignments" component={HODAssignmentsScreen} />
      <Stack.Screen name="HODReviewSubmission" component={HODReviewSubmissionScreen} />
      <Stack.Screen name="HODAssignInternalEvaluator" component={HODAssignInternalEvaluatorScreen} />
      <Stack.Screen name="HODProposeExternal" component={HODProposeExternalScreen} />
      <Stack.Screen name="HODNotifications" component={HODNotificationsScreen} />
      <Stack.Screen name="HODProfile" component={HODProfileScreen} />
    </Stack.Navigator>
  );
}
