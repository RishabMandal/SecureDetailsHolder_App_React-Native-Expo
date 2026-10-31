import React, { useContext, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { DocContext } from '../App';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { documents, setDocuments, preferences, setPreferences } = useContext(DocContext);
  const [newDocName, setNewDocName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const safePinnedDocs = preferences?.pinnedDocs || [];
  
  // FIX 1: Safely copy the array so we NEVER mutate the state directly
  let currentOrder = [...(preferences?.docOrder || [])];

  // Sync the display order with the actual documents we own
  const docKeys = Object.keys(documents);
  docKeys.forEach(key => { if (!currentOrder.includes(key)) currentOrder.push(key); });
  currentOrder = currentOrder.filter(key => docKeys.includes(key));

  const addDocument = () => {
    triggerHaptic();
    if (!newDocName.trim()) return;
    if (documents[newDocName]) return Alert.alert('Error', 'Document exists!');
    
    setDocuments({ ...documents, [newDocName]: { name: '', number: '' } });
    setNewDocName('');
  };

  const deleteDocument = (docName) => {
    triggerHaptic();
    const updatedDocs = { ...documents };
    delete updatedDocs[docName];
    setDocuments(updatedDocs);
  };

  const togglePin = (docName) => {
    triggerHaptic();
    const isPinned = safePinnedDocs.includes(docName);
    
    const newPinned = isPinned 
      ? safePinnedDocs.filter(d => d !== docName)
      : [...safePinnedDocs, docName];
    
    let newOrder = [...currentOrder];
    
    // FIX 2: Smart re-ordering when pinning AND unpinning
    if (!isPinned) {
      // If Pinning: Move to the very top
      newOrder = newOrder.filter(d => d !== docName);
      newOrder.unshift(docName);
    } else {
      // If Unpinning: Move it neatly below the currently pinned items
      newOrder = newOrder.filter(d => d !== docName);
      let insertIndex = newPinned.length; 
      newOrder.splice(insertIndex, 0, docName);
    }
    
    setPreferences({ ...preferences, pinnedDocs: newPinned, docOrder: newOrder });
  };

  const isSearching = searchQuery.trim().length > 0;
  const displayedDocs = isSearching
    ? currentOrder.filter(doc => doc.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentOrder;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add Document */}
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          placeholder="Add new document..."
          placeholderTextColor="#666"
          value={newDocName}
          onChangeText={setNewDocName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addDocument}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <DraggableFlatList
        data={displayedDocs}
        contentContainerStyle={{paddingBottom: 120}}
        // THE FIX: Forcing the animation engine to destroy the ghost by changing the key
        keyExtractor={(item) => `${item}-${safePinnedDocs.includes(item) ? 'pinned' : 'unpinned'}`}
        onDragEnd={({ data }) => setPreferences({ ...preferences, docOrder: data })}
        renderItem={({ item, drag, isActive }) => {
          const isPinned = safePinnedDocs.includes(item);
          return (
            <ScaleDecorator>
              <TouchableOpacity 
                activeOpacity={0.8}
                disabled={isActive}
                onPress={() => { triggerHaptic(); navigation.navigate('Details', { docType: item }); }}
                style={[styles.card, isPinned && styles.cardPinned, isActive && styles.cardActive]}
              >
                <View style={styles.cardContent}>
                  <Ionicons name={isPinned ? "folder-open" : "folder"} size={24} color={isPinned ? "#E50914" : "#888"} />
                  <Text style={styles.cardBtnText}>{item}</Text>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => togglePin(item)} style={styles.iconBtn}>
                    <Ionicons name={isPinned ? "pin" : "pin-outline"} size={22} color={isPinned ? "#E50914" : "#888"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteDocument(item)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#888" />
                  </TouchableOpacity>
                  
                  {!isSearching && (
                    <TouchableOpacity onPressIn={drag} disabled={isActive} style={styles.iconBtn}>
                      <Ionicons name="reorder-three" size={26} color="#555" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </ScaleDecorator>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0D0D0D' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 16 },
  addSection: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#1A1A1A', color: '#fff', padding: 15, borderRadius: 10, fontSize: 16 },
  addBtn: { backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center', width: 55, borderRadius: 10, marginLeft: 10 },
  card: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, marginBottom: 12, alignItems: 'center', overflow: 'hidden' },
  cardPinned: { borderColor: '#E50914', borderWidth: 1 },
  cardActive: { backgroundColor: '#262626', transform: [{ scale: 1.02 }], elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3 },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 20 },
  cardBtnText: { fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 15 },
  actions: { flexDirection: 'row', paddingRight: 10 },
  iconBtn: { padding: 8 },
});