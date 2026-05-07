import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';



// Screens
import RoleSelectScreen from '../screens/RoleSelectScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';

// Student screens
import StudentDashboard from '../screens/student/DashboardScreen';
import FeedbackDetailScreen from '../screens/student/FeedbackDetailScreen';
import FeedbackListScreen from '../screens/student/FeedbackScreen';
import StudentProfile from '../screens/student/ProfileScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import SubmissionsScreen from '../screens/student/SubmissionsScreen';


// Supervisor screens
import SupervisorDashboardScreen from '../screens/supervisor/DashboardScreen';
import GradeThesisScreen from '../screens/supervisor/GradeThesisScreen';
import SupervisorProfileScreen from '../screens/supervisor/ProfileScreen';
import ReviewReportScreen from '../screens/supervisor/ReviewReportScreen';
import ReviewsScreen from '../screens/supervisor/ReviewsScreen';
import StudentsScreen from '../screens/supervisor/StudentsScreen';
import SubmitDocumentsScreen from '../screens/supervisor/SubmitDocumentsScreen';

// Stack and Tab are two different navigation patterns
// Stack = push/pop screens (like a browser history)
// Tab = the bottom bar that switches between screens
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Simple emoji icons for now, we'll swap for real icons later
function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        // route.name tells us which tab we're on
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Submissions: 'document-text',
            Progress: 'bar-chart',
            Profile: 'person',
          };
          return (
            <Ionicons
              name={icons[route.name]}
              size={size}
              color={color}
            />
          );
        },
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
      <Stack.Screen name="NotificationsList" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function SupervisorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1E56A0',
        tabBarInactiveTintColor: '#9BA4B5',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Students: 'school',
            Reviews: 'search',
            Profile: 'person',
          };
          return (
            <Ionicons name={icons[route.name]} size={size} color={color} />
          );
        },
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
    </Stack.Navigator>
  );
}

// This is the root navigator, everything lives inside here
export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="StudentStack" component={StudentStack} />
        <Stack.Screen name="SupervisorStack" component={SupervisorStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}