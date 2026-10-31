import React, { useContext } from 'react';
import { StyleSheet, Text, View, Switch, ScrollView } from 'react-native';
import { DocContext } from '../App';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { preferences, setPreferences } = useContext(DocContext);
  
  // FIX: Safely initialize default settings if the object is empty
  const hasSettings = preferences.appSettings && Object.keys(preferences.appSettings).length > 0;
  const settings = hasSettings ? preferences.appSettings : {
    biometric: false,
    masking: true,
    pdfSupport: true,
    notifications: false,
    ocr: false,
  };

  const toggleSetting = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreferences({
      ...preferences,
      appSettings: { ...settings, [key]: !settings[key] }
    });
  };

  const SettingRow = ({ title, icon, settingKey, description }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={20} color="#E50914" style={{ marginRight: 8 }} />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={!!settings[settingKey]} // FIX: Force strict boolean
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: '#333', true: '#E50914' }}
        thumbColor={settings[settingKey] ? '#fff' : '#888'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Security & Features</Text>
      
      <SettingRow 
        title="Biometric App Lock" icon="finger-print" settingKey="biometric"
        description="Require Face ID / Fingerprint to open the vault." 
      />
      <SettingRow 
        title="Secure Data Masking" icon="eye-off" settingKey="masking"
        description="Hide sensitive details by default on the viewing screen." 
      />
      <SettingRow 
        title="PDF Support" icon="document" settingKey="pdfSupport"
        description="Allow uploading PDF files alongside images." 
      />
      
      <Text style={[styles.header, { marginTop: 30, color: '#888' }]}>Coming Soon</Text>
      
      <SettingRow 
        title="Expiry Notifications" icon="notifications" settingKey="notifications"
        description="Get alerts 30 days before a document expires." 
      />
      <SettingRow 
        title="Auto-Scan OCR" icon="scan" settingKey="ocr"
        description="Use the camera to auto-fill document details." 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: 20 },
  header: { fontSize: 16, fontWeight: 'bold', color: '#E50914', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  settingInfo: { flex: 1, paddingRight: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  settingTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingDesc: { color: '#888', fontSize: 12 },
});