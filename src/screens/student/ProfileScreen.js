import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CURRENT_STUDENT } from '../../data/mockData';
import { getStudentProfile } from '../../services/api';

export default function StudentProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [course, setCourse] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getStudentProfile(CURRENT_STUDENT.id);
      setProfile(data);
      setName(data.name);
      setStudentNumber(data.studentNumber);
      setCourse(data.course);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: PATCH /students/:id
      await new Promise((resolve) => setTimeout(resolve, 800));
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ── HERO HEADER ── */}
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Profile</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('NotificationsList')}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(profile?.name)}
                </Text>
              </View>
            </View>

            <Text style={styles.heroName}>{profile?.name}</Text>
            <Text style={styles.heroRole}>Student</Text>
          </View>

          <View style={styles.body}>

            {!isEditing ? (
              /* ── VIEW MODE ── */
              <>
                <View style={styles.card}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color="#6B7280" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{profile?.name}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="card-outline" size={18} color="#6B7280" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Student Number</Text>
                      <Text style={styles.infoValue}>
                        {profile?.studentNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={18} color="#6B7280" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Course</Text>
                      <Text style={styles.infoValue}>{profile?.course}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="bar-chart-outline"
                      size={18}
                      color="#6B7280"
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Progress</Text>
                      <Text style={styles.infoValue}>
                        {profile?.progressPercentage}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color="#6B7280"
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Proposal Stage</Text>
                      <Text style={styles.infoValue}>
                        {profile?.proposalStage}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── EDIT MODE ── */
              <>
                <Text style={styles.sectionTitle}>Update Profile Details</Text>
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#9BA4B5"
                  />
                  <Text style={styles.fieldLabel}>Student Number</Text>
                  <TextInput
                    style={styles.input}
                    value={studentNumber}
                    onChangeText={setStudentNumber}
                    placeholder="Enter student number"
                    placeholderTextColor="#9BA4B5"
                    keyboardType="numeric"
                  />
                  <Text style={styles.fieldLabel}>Course</Text>
                  <TextInput
                    style={styles.input}
                    value={course}
                    onChangeText={setCourse}
                    placeholder="Enter your course"
                    placeholderTextColor="#9BA4B5"
                  />
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setName(profile.name);
                      setStudentNumber(profile.studentNumber);
                      setCourse(profile.course);
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── SIGN OUT — always visible ── */}
            <TouchableOpacity style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  hero: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 8,
    // Subtle glow effect
    shadowColor: '#1E56A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  heroRole: {
    color: '#9BA4B5',
    fontSize: 15,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0D1B2A',
    marginBottom: 8,
  },
  saveSection: {
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 32,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
infoContent: {
  flex: 1,
},
infoLabel: {
  fontSize: 12,
  color: '#6B7280',
  marginBottom: 2,
},
infoValue: {
  fontSize: 15,
  color: '#0D1B2A',
  fontWeight: '500',
},
divider: {
  height: 1,
  backgroundColor: '#F3F4F6',
  marginVertical: 10,
},
editBtn: {
  backgroundColor: '#1E56A0',
  borderRadius: 12,
  padding: 16,
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 8,
},
editActions: {
  flexDirection: 'row',
  gap: 12,
},
cancelBtn: {
  flex: 1,
  borderRadius: 12,
  padding: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#1E56A0',
},
cancelBtnText: {
  color: '#1E56A0',
  fontSize: 16,
  fontWeight: '600',
},
saveBtn: {
  flex: 1,
  backgroundColor: '#1E56A0',
  borderRadius: 12,
  padding: 16,
  alignItems: 'center',
},
});