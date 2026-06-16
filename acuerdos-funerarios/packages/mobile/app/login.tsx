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

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleLogin = async () => {
    if (!usuario.trim() || !pin.trim()) {
      Alert.alert("Campos requeridos", "Ingresa tu usuario y PIN");
      return;
    }
    setLoading(true);
    try {
      await login(usuario.trim(), pin.trim());
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
          <Text style={styles.title}>Registro de Acuerdos</Text>
          <Text style={styles.subtitle}>Los Olivos · Ibagué</Text>

          <View style={styles.form}>
            <Text style={styles.label}>USUARIO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu usuario"
              placeholderTextColor="#555"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>PIN</Text>
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

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#0A0A0A" />
                : <Text style={styles.btnText}>Ingresar</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push("/registro")}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>Registrarse por primera vez</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { flexGrow: 1, padding: 28, justifyContent: "center" },
  logo: { width: 160, height: 85, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#F5F5F5", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#C9A84C", textAlign: "center", marginBottom: 40, letterSpacing: 1 },
  form: { gap: 4 },
  label: { fontSize: 11, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, marginBottom: 6, marginTop: 12 },
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
  btnPrimary: {
    backgroundColor: "#C9A84C", borderRadius: 10, paddingVertical: 15,
    alignItems: "center", marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  btnSecondary: { alignItems: "center", marginTop: 16, paddingVertical: 10 },
  btnSecondaryText: { color: "#555", fontSize: 13, textDecorationLine: "underline" },
});
