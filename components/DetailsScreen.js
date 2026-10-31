import React, { useContext, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TextInput, Image, Modal } from 'react-native';
import { DocContext } from '../App';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

export default function DetailsScreen({ route, navigation }) {
  const { docType } = route.params;
  const { documents, preferences, setPreferences } = useContext(DocContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  
  const settings = preferences.appSettings || {};
  const isMaskingEnabled = settings.masking === true;
  const [revealData, setRevealData] = useState(false);
  
  const docData = documents[docType];
  const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const copyToClipboard = async (label, text) => {
    triggerHaptic();
    if (!text) return Alert.alert("Empty", "No data to copy.");
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied!", `${label} copied to clipboard.`);
  };

  const togglePinField = (fieldKey) => {
    triggerHaptic();
    const docPins = preferences.pinnedFields?.[docType] || [];
    const isPinned = docPins.includes(fieldKey);
    const newPins = isPinned 
      ? docPins.filter(k => k !== fieldKey) 
      : [...docPins, fieldKey];

    setPreferences({
      ...preferences,
      pinnedFields: { ...preferences.pinnedFields, [docType]: newPins }
    });
  };

  const downloadOrShareFile = async (uri) => {
    triggerHaptic();
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Error", "Sharing is not available on this device.");
      return;
    }
    try {
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not export the file.");
    }
  };

  if (!docData) return null;

  const docPins = preferences.pinnedFields?.[docType] || [];
  
  const textFields = Object.keys(docData)
    .filter(key => key !== 'images' && key.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aPinned = docPins.includes(a);
      const bPinned = docPins.includes(b);
      if (aPinned === bPinned) return 0;
      return aPinned ? -1 : 1;
    });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        
        {/* FIX: Added numberOfLines to prevent infinite wrapping if the title is huge */}
        <Text style={styles.header} numberOfLines={2}>{docType}</Text>
        
        {/* FIX: Wrapped buttons in a style that prevents shrinking */}
        <View style={styles.headerButtons}>
          {isMaskingEnabled ? (
            <TouchableOpacity 
              style={[styles.editBtn, { backgroundColor: '#333', marginRight: 10 }]}
              onPress={() => { triggerHaptic(); setRevealData(!revealData); }}
            >
              <Ionicons name={revealData ? "eye-off" : "eye"} size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => { triggerHaptic(); navigation.navigate('Edit', { docType }); }}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fields..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {textFields.map((key) => {
          const isPinned = docPins.includes(key);
          return (
            <View key={key} style={[styles.detailRow, isPinned && styles.detailRowPinned]}>
              <TouchableOpacity onPress={() => togglePinField(key)} style={styles.pinBtn}>
                 <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color={isPinned ? "#E50914" : "#666"} />
              </TouchableOpacity>
              
              <View style={styles.detailTextContainer}>
                <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                
                <Text style={styles.value}>
                  {!docData[key] ? 'Not Added' 
                    : (isMaskingEnabled && !revealData) ? '•••• •••• ••••' 
                    : String(docData[key])}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.copyBtn} 
                onPress={() => copyToClipboard(key, docData[key])}
              >
                <Ionicons name="copy-outline" size={20} color="#E50914" />
              </TouchableOpacity>
            </View>
          );
        })}

        {docData.images && docData.images.length > 0 ? (
          <View style={styles.imagesSection}>
            <Text style={styles.imagesHeader}>ATTACHED FILES</Text>
            {docData.images.map((uri, index) => {
              const isPdf = uri.toLowerCase().endsWith('.pdf');
              
              if (isPdf) {
                return (
                  <View key={index} style={styles.pdfCard}>
                    <View style={styles.pdfInfo}>
                      <Ionicons name="document-text" size={32} color="#E50914" style={{ marginRight: 12 }} />
                      <Text style={styles.pdfText} numberOfLines={1}>
                        Document {index + 1}.pdf
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.downloadBtn} 
                      onPress={() => downloadOrShareFile(uri)}
                    >
                      <Ionicons name="download-outline" size={20} color="#fff" />
                      <Text style={styles.downloadBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.8} 
                  onPress={() => { triggerHaptic(); setSelectedImage(uri); }}
                >
                  <Image source={{ uri }} style={styles.documentImage} resizeMode="cover" />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <Modal 
        visible={selectedImage !== null} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)} 
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity 
            style={styles.closeModalBtn} 
            onPress={() => { triggerHaptic(); setSelectedImage(null); }}
          >
            <Ionicons name="close-circle" size={36} color="#E50914" />
          </TouchableOpacity>
          
          {selectedImage ? (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain" 
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  
  // FIX: Added flex: 1 and a margin to the header text so it leaves room for buttons
  header: { flex: 1, fontSize: 28, fontWeight: 'bold', color: '#fff', marginRight: 15 },
  
  // FIX: Created a strict wrapper for the buttons that will never shrink
  headerButtons: { flexDirection: 'row', flexShrink: 0 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 16 },
  scrollContent: { paddingBottom: 40 },
  detailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginBottom: 12 },
  detailRowPinned: { borderLeftWidth: 4, borderLeftColor: '#E50914' },
  pinBtn: { marginRight: 15 },
  detailTextContainer: { flex: 1 },
  label: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 'bold', letterSpacing: 1 },
  value: { fontSize: 18, color: '#ffffff', fontWeight: '500' },
  copyBtn: { padding: 10, backgroundColor: '#261414', borderRadius: 8 },
  editBtn: { flexDirection: 'row', backgroundColor: '#E50914', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center' },
  
  imagesSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#333' },
  imagesHeader: { color: '#E50914', fontSize: 14, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15 },
  documentImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333' },

  pdfCard: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  pdfInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  pdfText: { color: '#fff', fontSize: 16, fontWeight: '500', flexShrink: 1 },
  downloadBtn: { flexDirection: 'row', backgroundColor: '#E50914', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  downloadBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});