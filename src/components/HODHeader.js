// src/components/HODHeader.js
// Same style as AppHeader but navigates to HOD-specific screens
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HODHeader({ title, navigation, showBack = false }) {
  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <Text style={styles.headerTitle}>{title}</Text>
      )}

      {showBack && <Text style={styles.headerTitleCenter}>{title}</Text>}

      <View style={styles.headerIcons}>
        <TouchableOpacity
          onPress={() => navigation.navigate('HODNotifications')}
          style={styles.iconBtn}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('HODProfile')}
          style={styles.iconBtn}
        >
          <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleCenter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: { position: 'relative' },
  backBtn: { padding: 2 },
});