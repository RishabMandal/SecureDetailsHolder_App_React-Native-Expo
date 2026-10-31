import React, { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
} from "react-native";
import { DocContext } from "../App";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const GOOGLE_VISION_API_KEY = "YOUR_GOOGLE_CLOUD_API_KEY_HERE";

export default function EditScreen({ route, navigation }) {
  const { docType } = route.params;
  const { documents, setDocuments, preferences } = useContext(DocContext);

  // --- NEW: State for Document Title ---
  const [docTitle, setDocTitle] = useState(docType);
  
  const [formData, setFormData] = useState({ ...documents[docType] });
  const [newFieldKey, setNewFieldKey] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [enableImages, setEnableImages] = useState(
    !!formData.images && formData.images.length > 0,
  );

  const settings = preferences.appSettings || {};
  const isPdfEnabled = settings.pdfSupport !== false;
  const isOcrEnabled = settings.ocr === true;

  const triggerHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const handleSave = () => {
    let finalData = { ...formData };
    if (!enableImages) delete finalData.images;

    const newTitle = docTitle.trim();
    if (!newTitle) {
      return Alert.alert("Error", "Document name cannot be empty.");
    }

    // --- NEW: Rename Logic ---
    if (newTitle !== docType) {
      if (documents[newTitle]) {
        return Alert.alert("Error", "A document with this name already exists.");
      }
      
      // Transfer data to the new name and delete the old name
      const updatedDocs = { ...documents };
      delete updatedDocs[docType];
      updatedDocs[newTitle] = finalData;
      
      setDocuments(updatedDocs);
      
      // Navigate to Home so the underlying DetailsScreen doesn't crash looking for the old name
      Alert.alert("Success", "Document renamed securely.");
      navigation.navigate("Home");
    } else {
      setDocuments({ ...documents, [docType]: finalData });
      navigation.goBack();
    }
  };

  const addNewField = () => {
    if (!newFieldKey.trim()) return;
    const formattedKey = newFieldKey.toLowerCase().replace(/\s+/g, "_");
    setFormData((prev) => ({ ...prev, [formattedKey]: "" }));
    setNewFieldKey("");
  };

  const moveField = (index, direction) => {
    const keys = Object.keys(formData).filter((k) => k !== "images");
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= keys.length) return;
    const newKeys = [...keys];
    [newKeys[index], newKeys[newIndex]] = [newKeys[newIndex], newKeys[index]];

    const newFormData = { images: formData.images };
    newKeys.forEach((key) => (newFormData[key] = formData[key]));
    setFormData(newFormData);
  };

  const deleteField = (key) => {
    Alert.alert("Delete", `Remove field "${key.replace(/_/g, " ")}"?`, [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setFormData((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        },
      },
    ]);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const path =
        FileSystem.documentDirectory + (result.assets[0].name || "doc.pdf");
      await FileSystem.copyAsync({ from: uri, to: path });
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), path],
      }));
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const path = FileSystem.documentDirectory + uri.split("/").pop();
      await FileSystem.copyAsync({ from: uri, to: path });
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), path],
      }));
    }
  };

  const removeImage = (index) =>
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));

  const textFields = Object.keys(formData).filter((k) => k !== "images");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* --- NEW: Document Title Editor --- */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleLabel}>DOCUMENT NAME</Text>
        <TextInput
          style={styles.titleInput}
          value={docTitle}
          onChangeText={setDocTitle}
          placeholder="e.g. Bank Cheque Book"
          placeholderTextColor="#666"
        />
      </View>

      {isOcrEnabled && (
        <TouchableOpacity
          style={styles.ocrBtn}
          onPress={() => Alert.alert("Note", "Configure API Key")}
          disabled={isScanning}
        >
          <Ionicons name="scan" size={20} color="#fff" />
          <Text style={styles.ocrBtnText}>AUTO-SCAN DOCUMENT</Text>
        </TouchableOpacity>
      )}

      {textFields.map((key, index) => (
        <View key={key} style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              {key.replace(/_/g, " ").toUpperCase()}
            </Text>
            <View style={styles.reorderGroup}>
              <TouchableOpacity
                onPress={() => moveField(index, -1)}
                disabled={index === 0}
                style={styles.iconPad}
              >
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={index === 0 ? "#333" : "#888"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveField(index, 1)}
                disabled={index === textFields.length - 1}
                style={styles.iconPad}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={index === textFields.length - 1 ? "#333" : "#888"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteField(key)}
                style={styles.iconPad}
              >
                <Ionicons name="trash-outline" size={16} color="#E50914" />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={formData[key]}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, [key]: text }))
            }
            placeholder={`Enter ${key.replace(/_/g, " ")}`}
            placeholderTextColor="#999"
            multiline={key === "scanned_data" || key === "address"}
          />
        </View>
      ))}

      <View style={styles.addFieldContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="New Field"
          placeholderTextColor="#999"
          value={newFieldKey}
          onChangeText={setNewFieldKey}
        />
        <TouchableOpacity style={styles.addFieldBtn} onPress={addNewField}>
          <Text style={styles.addFieldBtnText}>+ Field</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageToggleContainer}>
        <Text style={styles.imageToggleText}>Enable Attachments</Text>
        <Switch
          value={enableImages}
          onValueChange={(val) => {
            triggerHaptic();
            setEnableImages(val);
          }}
          trackColor={{ false: "#333", true: "#E50914" }}
          thumbColor={enableImages ? "#fff" : "#888"}
        />
      </View>

      {enableImages && (
        <View style={styles.imageSection}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={[styles.uploadBtn, { flex: 1 }]}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.uploadBtnText}> Photo</Text>
            </TouchableOpacity>
            {isPdfEnabled && (
              <TouchableOpacity
                style={[styles.uploadBtn, { flex: 1, backgroundColor: "#444" }]}
                onPress={pickDocument}
              >
                <Ionicons name="document" size={20} color="#fff" />
                <Text style={styles.uploadBtnText}> PDF</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewContainer}
          >
            {(formData.images || []).map((uri, index) => (
              <View key={index} style={styles.previewWrapper}>
                {uri.toLowerCase().endsWith(".pdf") ? (
                  <View style={styles.pdfPreview}>
                    <Ionicons name="document-text" size={32} color="#E50914" />
                    <Text style={styles.pdfText}>PDF</Text>
                  </View>
                ) : (
                  <Image source={{ uri }} style={styles.previewImage} />
                )}
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#E50914" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>SAVE DETAILS</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#0D0D0D" },
  
  // --- NEW: Styles for the Document Title Editor ---
  titleContainer: { marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  titleLabel: { fontSize: 12, color: '#888', fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
  titleInput: { fontSize: 24, fontWeight: 'bold', color: '#fff', padding: 0 },

  inputContainer: { marginBottom: 15 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: { fontSize: 12, color: "#E50914", fontWeight: "bold" },
  reorderGroup: { flexDirection: "row", alignItems: "center" },
  iconPad: { paddingHorizontal: 5 },
  input: {
    backgroundColor: "#1A1A1A",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 50,
  },
  addFieldContainer: { flexDirection: "row", marginTop: 10, marginBottom: 30 },
  addFieldBtn: {
    backgroundColor: "#333",
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  addFieldBtnText: { color: "#fff", fontWeight: "bold" },
  ocrBtn: {
    flexDirection: "row",
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  ocrBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
  saveBtn: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  imageToggleText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  imageSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: { color: "#fff", fontWeight: "bold" },
  previewContainer: { flexDirection: "row", marginTop: 10 },
  previewWrapper: { marginRight: 15, position: "relative" },
  previewImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  pdfPreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  pdfText: { color: "#fff", fontSize: 10, marginTop: 5 },
  removeImageBtn: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#000",
    borderRadius: 12,
  },
});