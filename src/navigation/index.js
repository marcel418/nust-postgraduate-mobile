// src/navigation/index.js

import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import { api } from '../api/http';
import { useAuthStore } from '../store/authStore';

// ─── Student ──────────────────────────────────────────────────────────────────
import StudentNotificationsScreen from '../screens/student/NotificationsScreen';
import StudentDashboard from '../screens/student/DashboardScreen';
import FeedbackDetailScreen from '../screens/student/FeedbackDetailScreen';
import FeedbackListScreen from '../screens/student/FeedbackScreen';
import StudentProfile from '../screens/student/ProfileScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import SubmissionsScreen from '../screens/student/SubmissionsScreen';

// ─── Admin ────────────────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import SubmissionsOverviewScreen from '../screens/admin/SubmissionsOverviewScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import AdminNotificationsScreen from '../screens/admin/NotificationsScreen';
import SemesterManagementScreen from '../screens/admin/SemesterManagementScreen';

// ─── Supervisor ───────────────────────────────────────────────────────────────
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import GradeThesisScreen from '../screens/supervisor/GradeThesisScreen';
import SupervisorProfileScreen from '../screens/supervisor/ProfileScreen';
import ReviewReportScreen from '../screens/supervisor/ReviewReportScreen';
import ReviewsScreen from '../screens/supervisor/ReviewsScreen';
import StudentsScreen from '../screens/supervisor/StudentsScreen';
import SubmitDocumentsScreen from '../screens/supervisor/SubmitDocumentsScreen';

// ─── HOD ──────────────────────────────────────────────────────────────────────
import HODDashboardScreen from '../screens/hod/HODDashboardScreen';
import {
  HODSubmissionsScreen,
  HODAssignmentsScreen,
  HODNotificationsScreen,
  HODProfileScreen,
} from '../screens/hod/HODExtraScreens';
import HODReviewSubmissionScreen from '../screens/hod/HODReviewSubmissionScreen';
import {
  HODAssignInternalEvaluatorScreen,
  HODProposeExternalScreen,
} from '../screens/hod/HODWorkflowScreens';

// ─── Internal Evaluator ───────────────────────────────────────────────────────
import {
  EvaluatorDashboard,
  EvaluatorEvaluations,
  EvaluatorProposalDetail,
  EvaluatorProfile,
  EvaluatorNotifications,
} from '../screens/evaluator/EvaluatorScreens';

// ─── External Evaluator ───────────────────────────────────────────────────────
import {
  ExternalEvaluatorClaims,
  ExternalEvaluatorDashboard,
  ExternalEvaluatorNotifications,
  ExternalEvaluatorProfile,
  ExternalEvaluatorThesisDetail,
  ExternalEvaluatorTheses,
} from '../screens/externalEvaluator/ExternalEvaluatorScreens';

// ─── FPGC-R ───────────────────────────────────────────────────────────────────
import {
  FPGCRDashboard,
  FPGCRReviews,
  FPGCRHdcDecision,
  FPGCRDecisions,
  FPGCRProfile,
  FPGCRNotifications,
} from '../screens/fpgcr/FPGCRScreens';

// ─── FPGC ─────────────────────────────────────────────────────────────────────
import {
  FPGCDashboard,
  FPGCApplications,
  FPGCAssignments,
  FPGCProfile,
  FPGCNotifications,
} from '../screens/fpgc/FPGCScreens';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRoleNames(roles = [], user = null) {
  const rawRoles =
    Array.isArray(roles) && roles.length
      ? roles
      : Array.isArray(user?.roles)
        ? user.roles
        : user?.role
          ? [user.role]
          : [];

  return rawRoles
    .map((role) => {
      if (typeof role === 'string') return role;

      return (
        role?.name ||
        role?.code ||
        role?.slug ||
        role?.role ||
        role?.role_name ||
        ''
      );
    })
    .filter(Boolean)
    .map((role) => String(role).trim().toUpperCase().replace(/[\s-]+/g, '_'));
}

function getPrimaryRole(roleNames) {
  const priority = [
    'SYSTEM_ADMIN',
    'ADMIN',
    'FPGC',
    'FPGC_R',
    'HOD',
    'INTERNAL_EVALUATOR',
    'EXTERNAL_EVALUATOR',
    'SUPERVISOR',
    'STUDENT',
  ];

  return priority.find((role) => roleNames.includes(role)) || roleNames[0] || null;
}

function screenIcon(routeName, icons) {
  return icons[routeName] || 'ellipse-outline';
}

function formatDate(value) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-NA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function LoadingScreen() {
  return (
    <View style={styles.centerScreen}>
      <ActivityIndicator size="large" color="#1E56A0" />
      <Text style={styles.centerText}>Loading your workspace...</Text>
    </View>
  );
}

function NoRoleScreen({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.centerScreen}>
      <Text style={styles.title}>No active role found</Text>

      <Text style={styles.centerText}>
        {user?.email || 'This account'} does not have a recognised role assigned.
      </Text>

      <Text style={styles.centerText}>
        Ask an administrator to assign a valid role, or use the manual selector for testing.
      </Text>

      <View style={styles.actionGroup}>
        <Button
          title="Use Manual Role Selector"
          onPress={() => navigation.navigate('RoleSelect')}
        />
        <Button title="Sign Out" color="#B42318" onPress={logout} />
      </View>
    </View>
  );
}

function GenericNotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const items = response?.data?.items || response?.items || [];

      setNotifications(
        [...items].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
      );
    } catch (error) {
      Alert.alert('Could not load notifications', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (item) => {
    if (item.read_at) return;

    try {
      await api.post(`/notifications/${item.id}/read`);
      await loadNotifications();
    } catch (error) {
      Alert.alert('Could not update notification', error?.message || 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.centerText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.notificationsContainer}>
      <View style={styles.simpleHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.simpleHeaderTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.notificationsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        renderItem={({ item }) => {
          const read = !!item.read_at;

          return (
            <TouchableOpacity
              style={[styles.notificationCard, !read && styles.notificationUnread]}
              onPress={() => markAsRead(item)}
            >
              <Ionicons
                name={read ? 'mail-open-outline' : 'mail-unread-outline'}
                size={22}
                color={read ? '#6B7280' : '#1E56A0'}
              />

              <View style={{ flex: 1 }}>
                <Text style={[styles.notificationText, !read && styles.notificationTextUnread]}>
                  {item.message || item.title || 'Notification'}
                </Text>
                <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#9BA4B5" />
            <Text style={styles.centerText}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────────────────────────────────────

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              Home: 'home',
              Submissions: 'document-text',
              Progress: 'bar-chart',
              Profile: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={StudentDashboard} />
      <Tab.Screen name="Submissions" component={SubmissionsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={StudentProfile} />
    </Tab.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="FeedbackList" component={FeedbackListScreen} />
      <Stack.Screen name="FeedbackDetail" component={FeedbackDetailScreen} />
      <Stack.Screen name="NotificationsList" component={StudentNotificationsScreen} />
      <Stack.Screen name="Profile" component={StudentProfile} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Supervisor
// ─────────────────────────────────────────────────────────────────────────────

function SupervisorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              Home: 'home',
              Students: 'school',
              Reviews: 'search',
              Profile: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={SupervisorDashboardScreen} />
      <Tab.Screen name="Students" component={StudentsScreen} />
      <Tab.Screen name="Reviews" component={ReviewsScreen} />
      <Tab.Screen name="Profile" component={SupervisorProfileScreen} />
    </Tab.Navigator>
  );
}

function SupervisorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupervisorTabs" component={SupervisorTabs} />
      <Stack.Screen name="ReviewReport" component={ReviewReportScreen} />
      <Stack.Screen name="SubmitDocuments" component={SubmitDocumentsScreen} />
      <Stack.Screen name="GradeThesis" component={GradeThesisScreen} />
      <Stack.Screen name="NotificationsList" component={GenericNotificationsScreen} />
      <Stack.Screen name="Profile" component={SupervisorProfileScreen} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOD
// ─────────────────────────────────────────────────────────────────────────────

function HODTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              HODHome: 'home',
              HODSubmissions: 'document-text',
              HODAssignments: 'person-add',
              HODProfile: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="HODHome" component={HODDashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="HODSubmissions" component={HODSubmissionsScreen} options={{ tabBarLabel: 'Submissions' }} />
      <Tab.Screen name="HODAssignments" component={HODAssignmentsScreen} options={{ tabBarLabel: 'Assignments' }} />
      <Tab.Screen name="HODProfile" component={HODProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function HODStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HODTabs" component={HODTabs} />
      <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Internal Evaluator
// ─────────────────────────────────────────────────────────────────────────────

function EvaluatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              EvalHome: 'home',
              EvalEvaluations: 'search',
              EvalProfile: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="EvalHome" component={EvaluatorDashboard} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="EvalEvaluations" component={EvaluatorEvaluations} options={{ tabBarLabel: 'Evaluations' }} />
      <Tab.Screen name="EvalProfile" component={EvaluatorProfile} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function EvaluatorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EvalTabs" component={EvaluatorTabs} />
      <Stack.Screen name="EvalDashboard" component={EvaluatorDashboard} />
      <Stack.Screen name="EvalProposalDetail" component={EvaluatorProposalDetail} />
      <Stack.Screen name="EvalNotifications" component={EvaluatorNotifications} />
      <Stack.Screen name="EvalProfile" component={EvaluatorProfile} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// External Evaluator
// ─────────────────────────────────────────────────────────────────────────────

function ExternalEvaluatorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              ExtHome: 'home',
              ExtTheses: 'document-text',
              ExtClaims: 'wallet',
              ExtProfile: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="ExtHome" component={ExternalEvaluatorDashboard} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="ExtTheses" component={ExternalEvaluatorTheses} options={{ tabBarLabel: 'Thesis' }} />
      <Tab.Screen name="ExtClaims" component={ExternalEvaluatorClaims} options={{ tabBarLabel: 'Claims' }} />
      <Tab.Screen name="ExtProfile" component={ExternalEvaluatorProfile} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function ExternalEvaluatorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExtTabs" component={ExternalEvaluatorTabs} />
      <Stack.Screen name="ExtThesisDetail" component={ExternalEvaluatorThesisDetail} />
      <Stack.Screen name="ExtNotifications" component={ExternalEvaluatorNotifications} />
      <Stack.Screen name="ExtProfile" component={ExternalEvaluatorProfile} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FPGC-R
// ─────────────────────────────────────────────────────────────────────────────

function FPGCRTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              FPGCRHome: 'home',
              FPGCRReviews: 'search',
              FPGCRDecisions: 'checkmark-done',
              FPGCRProfileTab: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="FPGCRHome" component={FPGCRDashboard} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="FPGCRReviews" component={FPGCRReviews} options={{ tabBarLabel: 'Reviews' }} />
      <Tab.Screen name="FPGCRDecisions" component={FPGCRDecisions} options={{ tabBarLabel: 'Decisions' }} />
      <Tab.Screen name="FPGCRProfileTab" component={FPGCRProfile} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function FPGCRStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FPGCRTabs" component={FPGCRTabs} />
      <Stack.Screen name="FPGCRDashboard" component={FPGCRDashboard} />
      <Stack.Screen name="FPGCRHdcDecision" component={FPGCRHdcDecision} />
      <Stack.Screen name="FPGCRNotifications" component={FPGCRNotifications} />
      <Stack.Screen name="FPGCRProfile" component={FPGCRProfile} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FPGC
// ─────────────────────────────────────────────────────────────────────────────

function FPGCTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              FPGCHome: 'home',
              FPGCApplications: 'document-text',
              FPGCAssignments: 'people',
              FPGCProfileTab: 'person',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="FPGCHome" component={FPGCDashboard} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="FPGCApplications" component={FPGCApplications} options={{ tabBarLabel: 'Applications' }} />
      <Tab.Screen name="FPGCAssignments" component={FPGCAssignments} options={{ tabBarLabel: 'Assignments' }} />
      <Tab.Screen name="FPGCProfileTab" component={FPGCProfile} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function FPGCStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FPGCTabs" component={FPGCTabs} />
      <Stack.Screen name="FPGCDashboard" component={FPGCDashboard} />
      <Stack.Screen name="FPGCApplications" component={FPGCApplications} />
      <Stack.Screen name="FPGCAssignments" component={FPGCAssignments} />
      <Stack.Screen name="FPGCNotifications" component={FPGCNotifications} />
      <Stack.Screen name="FPGCProfile" component={FPGCProfile} />
      <Stack.Screen name="SemesterManagement" component={SemesterManagementScreen} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={screenIcon(route.name, {
              Home: 'home',
              Users: 'people',
              Submissions: 'document-text',
              Settings: 'settings',
            })}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={AdminDashboardScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Submissions" component={SubmissionsOverviewScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="NotificationsList" component={AdminNotificationsScreen} />
      <Stack.Screen name="Profile" component={SettingsScreen} />
      <Stack.Screen name="SemesterManagement" component={SemesterManagementScreen} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual role selector fallback
// ─────────────────────────────────────────────────────────────────────────────

function ManualRoleSelectStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NoRole" component={NoRoleScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="StudentStack" component={StudentStack} />
      <Stack.Screen name="SupervisorStack" component={SupervisorStack} />
      <Stack.Screen name="HODStack" component={HODStack} />
      <Stack.Screen name="EvaluatorStack" component={EvaluatorStack} />
      <Stack.Screen name="ExternalEvaluatorStack" component={ExternalEvaluatorStack} />
      <Stack.Screen name="FPGCRStack" component={FPGCRStack} />
      <Stack.Screen name="FPGCStack" component={FPGCStack} />
      <Stack.Screen name="AdminStack" component={AdminStack} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root navigation
// ─────────────────────────────────────────────────────────────────────────────

export default function Navigation() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const bootstrapping = useAuthStore((state) => state.bootstrapping);

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <AuthStack />;
  }

  const roleNames = getRoleNames(roles, user);
  const primaryRole = getPrimaryRole(roleNames);

  const roleStackMap = {
    STUDENT: StudentStack,
    SUPERVISOR: SupervisorStack,
    HOD: HODStack,
    INTERNAL_EVALUATOR: EvaluatorStack,
    EXTERNAL_EVALUATOR: ExternalEvaluatorStack,
    FPGC_R: FPGCRStack,
    FPGC: FPGCStack,
    SYSTEM_ADMIN: AdminStack,
    ADMIN: AdminStack,
  };

  const SelectedStack = roleStackMap[primaryRole] || ManualRoleSelectStack;

  return <SelectedStack key={primaryRole || 'NO_ROLE'} />;
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    backgroundColor: '#EEF3FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#07122A',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  centerText: {
    color: '#5D6678',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  actionGroup: {
    width: '100%',
    gap: 12,
    marginTop: 12,
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  simpleHeader: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  notificationsList: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#1E56A0',
  },
  notificationText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTextUnread: {
    color: '#0D1B2A',
    fontWeight: '700',
  },
  notificationDate: {
    color: '#9BA4B5',
    fontSize: 12,
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
    gap: 12,
  },
});
