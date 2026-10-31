import React, { useContext, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { DocContext } from '../App';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function DevScreen() {
  const { documents, setDocuments, preferences, setPreferences } = useContext(DocContext);
  const [importText, setImportText] = useState('');

  // --- EXPORT LOGIC (STRIP IMAGES) ---
  const getExportData = () => {
    // 1. Deep clone the documents so we don't accidentally delete images from the live app
    const docsCopy = JSON.parse(JSON.stringify(documents));
    
    // 2. Loop through all documents and remove the 'images' array
    Object.keys(docsCopy).forEach(docKey => {
      if (docsCopy[docKey].images) {
        delete docsCopy[docKey].images;
      }
    });

    return JSON.stringify({ documents: docsCopy, preferences }, null, 2);
  };

  const exportDataStr = getExportData();

  const copyToClipboard = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(exportDataStr);
    Alert.alert("Export Copied!", "Your vault data (without images) is ready to be saved securely.");
  };

  // --- IMPORT LOGIC ---
  const handleImport = async () => {
    if (!importText.trim()) return Alert.alert("Empty", "Please paste your JSON data first.");

    try {
      // Try to read the pasted text as JSON
      const parsedData = JSON.parse(importText);

      // Security Check: Make sure it has the exact structure we need
      if (parsedData.documents && parsedData.preferences) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Overwrite the global state and secure storage instantly
        await setDocuments(parsedData.documents);
        await setPreferences(parsedData.preferences);
        
        setImportText(''); // Clear the input box
        Alert.alert("Import Successful", "Your vault has been completely restored!");
      } else {
        Alert.alert("Invalid Backup", "The JSON is missing 'documents' or 'preferences'.");
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Format Error", "The text you pasted is not valid JSON.");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- EXPORT SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.header}>Export Vault</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={copyToClipboard}>
            <Ionicons name="copy" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>COPY JSON</Text>
          </TouchableOpacity>
        </View>

        {/* FIX: Changed View to ScrollView and added nestedScrollEnabled */}
        <ScrollView 
          style={styles.codeContainer} 
          nestedScrollEnabled={true}
        >
          <Text style={styles.codeText}>{exportDataStr}</Text>
        </ScrollView>

        <View style={styles.divider} />

        {/* --- IMPORT SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.header}>Import Vault</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E50914' }]} onPress={handleImport}>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>RESTORE</Text>
          </TouchableOpacity>
        </View>

        {/* FIX: Added scrollEnabled={true} */}
        <TextInput
          style={styles.importInput}
          placeholder="Paste your backup JSON here..."
          placeholderTextColor="#666"
          multiline={true}
          scrollEnabled={true}
          value={importText}
          onChangeText={setImportText}
          autoCorrect={false}
          autoCapitalize="none"
        />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#E50914' },
  
  actionBtn: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  
  codeContainer: { height: 250, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  codeText: { color: '#00FF41', fontFamily: 'monospace', fontSize: 12 },
  
  divider: { height: 1, backgroundColor: '#333', marginVertical: 30 },
  
  importInput: { height: 250, backgroundColor: '#1A1A1A', color: '#fff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333', textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12 },
});