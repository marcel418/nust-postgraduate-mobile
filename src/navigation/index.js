import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// ─── Role Select ──────────────────────────────────────────────────────────────
import RoleSelectScreen from '../screens/RoleSelectScreen';

// ─── Student ──────────────────────────────────────────────────────────────────
import NotificationsScreen from '../screens/student/NotificationsScreen';
import StudentDashboard from '../screens/student/DashboardScreen';
import FeedbackDetailScreen from '../screens/student/FeedbackDetailScreen';
import FeedbackListScreen from '../screens/student/FeedbackScreen';
import StudentProfile from '../screens/student/ProfileScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import SubmissionsScreen from '../screens/student/SubmissionsScreen';

import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import SubmissionsOverviewScreen from '../screens/admin/SubmissionsOverviewScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import AdminNotificationsScreen from '../screens/admin/NotificationsScreen';
import AdminProfileScreen from '../screens/supervisor/ProfileScreen';

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
import { HODSubmissionsScreen, HODAssignmentsScreen, HODNotificationsScreen, HODProfileScreen } from '../screens/hod/HODExtraScreens';
import HODReviewSubmissionScreen from '../screens/hod/HODReviewSubmissionScreen';
import { HODAssignInternalEvaluatorScreen, HODProposeExternalScreen } from '../screens/hod/HODWorkflowScreens';

// ─── Internal Evaluator ───────────────────────────────────────────────────────
import { EvaluatorDashboard, EvaluatorEvaluations, EvaluatorProposalDetail, EvaluatorProfile, EvaluatorNotifications } from '../screens/evaluator/EvaluatorScreens';

// ─── FPGC-R ───────────────────────────────────────────────────────────────────
import { FPGCRDashboard, FPGCRReviews, FPGCRHdcDecision, FPGCRDecisions, FPGCRProfile, FPGCRNotifications } from '../screens/fpgcr/FPGCRScreens';

// ─── FPGC ─────────────────────────────────────────────────────────────────────
import { FPGCDashboard, FPGCApplications, FPGCAssignments, FPGCProfile, FPGCNotifications } from '../screens/fpgc/FPGCScreens';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Student ──────────────────────────────────────────────────────────────────
function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ Home: 'home', Submissions: 'document-text', Progress: 'bar-chart', Profile: 'person' }[route.name]} size={size} color={color} /> })}>
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
      <Stack.Screen name="NotificationsList" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// ─── Supervisor ───────────────────────────────────────────────────────────────
function SupervisorTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ Home: 'home', Students: 'school', Reviews: 'search', Profile: 'person' }[route.name]} size={size} color={color} /> })}>
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
    </Stack.Navigator>
  );
}

// ─── HOD ──────────────────────────────────────────────────────────────────────
function HODTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ HODHome: 'home', HODSubmissions: 'document-text', HODAssignments: 'person-add', HODProfile: 'person' }[route.name]} size={size} color={color} /> })}>
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
      <Stack.Screen name="HODReviewSubmission" component={HODReviewSubmissionScreen} />
      <Stack.Screen name="HODAssignInternalEvaluator" component={HODAssignInternalEvaluatorScreen} />
      <Stack.Screen name="HODProposeExternal" component={HODProposeExternalScreen} />
      <Stack.Screen name="HODNotifications" component={HODNotificationsScreen} />
    </Stack.Navigator>
  );
}

// ─── Internal Evaluator ───────────────────────────────────────────────────────
function EvaluatorTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ EvalHome: 'home', EvalEvaluations: 'search', EvalProposals: 'document-text', EvalProfile: 'person' }[route.name]} size={size} color={color} /> })}>
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
    </Stack.Navigator>
  );
}

// ─── FPGC-R ───────────────────────────────────────────────────────────────────
function FPGCRTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ FPGCRHome: 'home', FPGCRReviews: 'search', FPGCRDecisions: 'checkmark-done', FPGCRProfileTab: 'person' }[route.name]} size={size} color={color} /> })}>
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

// ─── FPGC ─────────────────────────────────────────────────────────────────────
function FPGCTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#1E56A0', tabBarInactiveTintColor: '#9BA4B5', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name={{ FPGCHome: 'home', FPGCApplications: 'document-text', FPGCAssignments: 'people', FPGCProfileTab: 'person' }[route.name]} size={size} color={color} /> })}>
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
      <Stack.Screen name="FPGCNotifications" component={FPGCNotifications} />
      <Stack.Screen name="FPGCProfile" component={FPGCProfile} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Users: 'people',
            Submissions: 'document-text',
            Settings: 'settings',
          };
          return (
            <Ionicons name={icons[route.name]} size={size} color={color} />
          );
        },
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
      <Stack.Screen name="Profile" component={AdminProfileScreen} />
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Navigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="StudentStack" component={StudentStack} />
      <Stack.Screen name="SupervisorStack" component={SupervisorStack} />
      <Stack.Screen name="HODStack" component={HODStack} />
      <Stack.Screen name="EvaluatorStack" component={EvaluatorStack} />
      <Stack.Screen name="FPGCRStack" component={FPGCRStack} />
      <Stack.Screen name="FPGCStack" component={FPGCStack} />
      <Stack.Screen name="AdminStack" component={AdminStack} />
    </Stack.Navigator>
  );
}