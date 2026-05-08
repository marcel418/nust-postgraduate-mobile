import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// navigation is automatically passed by React Navigation to every screen
export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PGMS</Text>
      <Text style={styles.subtitle}>Select your role to continue</Text>

      {/* TouchableOpacity is basically a pressable button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('StudentStack')}
      >
        <Text style={styles.buttonText}>I am a Student</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.supervisorButton]}
        onPress={() => navigation.navigate('SupervisorStack')}
      >
        <Text style={styles.buttonText}>I am a Supervisor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1931',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA4B5',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#1E56A0',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  supervisorButton: {
    backgroundColor: '#163172',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});