import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Image, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Ionicons } from "@expo/vector-icons";

export default function RegistroScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [seguridad, setSeguridad] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !usuario.trim() || !pin || !seguridad.trim()) {
      Alert.alert("Campos requeridos", "Completa todos los campos");
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert("Error", "Los PIN no coinciden");
      return;
    }
    setLoading(true);
    try {
      await register(nombre.trim(), usuario.trim(), pin, seguridad.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Solo personal autorizado de Los Olivos</Text>

          <View style={styles.form}>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor="#555"
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.label}>USUARIO</Text>
            <TextInput
              style={styles.input}
              placeholder="Elige un usuario"
              placeholderTextColor="#555"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>PIN (mínimo 4 dígitos)</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="PIN de acceso"
                placeholderTextColor="#555"
                value={pin}
                onChangeText={setPin}
                keyboardType="numeric"
                secureTextEntry={!showPin}
                maxLength={8}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPin(!showPin)}>
                <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>CONFIRMAR PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite el PIN"
              placeholderTextColor="#555"
              value={pinConfirm}
              onChangeText={setPinConfirm}
              keyboardType="numeric"
              secureTextEntry={!showPin}
              maxLength={8}
            />

            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#C9A84C" />
              <Text style={styles.securityTitle}>Pregunta de seguridad</Text>
            </View>
            <Text style={styles.securityQ}>¿Cuál es el nombre completo de la empresa y su ciudad?</Text>
            <TextInput
              style={styles.input}
              placeholder="Respuesta"
              placeholderTextColor="#555"
              value={seguridad}
              onChangeText={setSeguridad}
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#0A0A0A" />
                : <Text style={styles.btnText}>Crear cuenta</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>Ya tengo cuenta · Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { flexGrow: 1, padding: 28, paddingTop: 20 },
  logo: { width: 130, height: 70, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#F5F5F5", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#555", textAlign: "center", marginBottom: 30 },
  form: { gap: 4 },
  label: { fontSize: 11, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: "#F5F5F5", fontSize: 14, marginBottom: 4,
  },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eyeBtn: {
    backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A",
    borderRadius: 10, padding: 14, marginBottom: 4,
  },
  securityBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 20, marginBottom: 6,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#2A2A2A",
  },
  securityTitle: { fontSize: 11, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase" },
  securityQ: { fontSize: 13, color: "#AAA", marginBottom: 8, lineHeight: 18 },
  btnPrimary: {
    backgroundColor: "#C9A84C", borderRadius: 10, paddingVertical: 15,
    alignItems: "center", marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  btnSecondary: { alignItems: "center", marginTop: 16, paddingVertical: 10 },
  btnSecondaryText: { color: "#555", fontSize: 13, textDecorationLine: "underline" },
});
