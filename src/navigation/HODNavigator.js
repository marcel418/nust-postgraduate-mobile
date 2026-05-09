// src/navigation/HODNavigator.js
// Full HOD workflow navigator based on user flow diagram:
// Dashboard → Submissions List → Review Submission
//   → Assign Internal Evaluator (if no eval yet)
//   → Propose External Evaluator (on Approve)
// Assignments tab → Assign Internal Evaluator
// Notifications, Profile accessible from all screens

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HODDashboardScreen from '../screens/hod/HODDashboardScreen';
import HODSubmissionsListScreen from '../screens/hod/HODSubmissionsListScreen';
import HODAssignmentsScreen from '../screens/hod/HODAssignmentsScreen';
import HODReviewSubmissionScreen from '../screens/hod/HODReviewSubmissionScreen';
import HODAssignInternalEvaluatorScreen from '../screens/hod/HODAssignInternalEvaluatorScreen';
import HODProposeExternalScreen from '../screens/hod/HODProposeExternalScreen';
import HODNotificationsScreen from '../screens/hod/HODNotificationsScreen';
import HODProfileScreen from '../screens/hod/HODProfileScreen';

const Stack = createNativeStackNavigator();

export default function HODNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Entry point */}
      <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />

      {/* Bottom nav tabs */}
      <Stack.Screen name="HODSubmissionsList" component={HODSubmissionsListScreen} />
      <Stack.Screen name="HODAssignments" component={HODAssignmentsScreen} />
      <Stack.Screen name="HODProfile" component={HODProfileScreen} />

      {/* Workflow screens */}
      <Stack.Screen name="HODReviewSubmission" component={HODReviewSubmissionScreen} />
      <Stack.Screen name="HODAssignInternalEvaluator" component={HODAssignInternalEvaluatorScreen} />
      <Stack.Screen name="HODProposeExternal" component={HODProposeExternalScreen} />

      {/* Utility */}
      <Stack.Screen name="HODNotifications" component={HODNotificationsScreen} />
    </Stack.Navigator>
  );
}