// src/navigation/HODNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HODDashboardScreen from '../screens/hod/HODDashboardScreen';
import HODSubmissionDetailScreen from '../screens/hod/HODSubmissionDetailScreen';
import HODAssignEvaluatorScreen from '../screens/hod/HODAssignEvaluatorScreen';
import HODNotificationsScreen from '../screens/hod/HODNotificationsScreen';
import HODProfileScreen from '../screens/hod/HODProfileScreen';

const Stack = createNativeStackNavigator();

export default function HODNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />
      <Stack.Screen name="HODSubmissions" component={HODDashboardScreen} />
      <Stack.Screen name="HODAssignments" component={HODDashboardScreen} />
      <Stack.Screen name="HODSubmissionDetail" component={HODSubmissionDetailScreen} />
      <Stack.Screen name="HODAssignEvaluator" component={HODAssignEvaluatorScreen} />
      <Stack.Screen name="HODNotifications" component={HODNotificationsScreen} />
      <Stack.Screen name="HODProfile" component={HODProfileScreen} />
    </Stack.Navigator>
  );
}