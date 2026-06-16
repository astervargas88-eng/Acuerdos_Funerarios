import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";

const EMPTY_FORM = {
  clienteNombre: "",
  clienteCedula: "",
  clienteTelefono: "",
  clienteDireccion: "",
  asesorNombre: "",
  fallecidoNombre: "",
  fallecidoCedula: "",
};

export default function NuevoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.clienteNombre.trim() || !form.clienteCedula.trim() || !form.clienteTelefono.trim() || !form.asesorNombre.trim()) {
        throw new Error("Completa los campos obligatorios (*)");
      }
      // Capture nombre BEFORE resetting form
      const nombre = form.clienteNombre.trim();
      const result = await apiFetch<{ acuerdo: { id: number } }>("/acuerdos", {
        method: "POST",
        body: JSON.stringify(form),
      });
      return { result, nombre };
    },
    onSuccess: ({ result, nombre }) => {
      const id = result.acuerdo?.id;
      // Invalidate list queries so historial and index refresh
      queryClient.invalidateQueries({ queryKey: ["acuerdos"] });
      queryClient.invalidateQueries({ queryKey: ["acuerdos-historial"] });
      // Reset form
      setForm({ ...EMPTY_FORM });
      if (id) {
        router.push(`/consentimiento/${id}?nombre=${encodeURIComponent(nombre)}`);
      }
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm((f) => ({ ...f, [key]: v })),
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {user ? (
            <View style={styles.userBadge}>
              <Ionicons name="person-circle-outline" size={14} color="#C9A84C" />
              <Text style={styles.userText}>{user.nombre}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ASESOR</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del asesor *"
              placeholderTextColor="#555555"
              {...field("asesorNombre")}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATOS DEL CLIENTE</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo *"
              placeholderTextColor="#555555"
              {...field("clienteNombre")}
            />
            <TextInput
              style={styles.input}
              placeholder="Cédula / Documento *"
              placeholderTextColor="#555555"
              keyboardType="numeric"
              {...field("clienteCedula")}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono *"
              placeholderTextColor="#555555"
              keyboardType="phone-pad"
              {...field("clienteTelefono")}
            />
            <TextInput
              style={styles.input}
              placeholder="Dirección (opcional)"
              placeholderTextColor="#555555"
              {...field("clienteDireccion")}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATOS DEL SER QUERIDO (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del ser querido"
              placeholderTextColor="#555555"
              {...field("fallecidoNombre")}
            />
            <TextInput
              style={styles.input}
              placeholder="Cédula del ser querido"
              placeholderTextColor="#555555"
              keyboardType="numeric"
              {...field("fallecidoCedula")}
            />
          </View>

          <Text style={styles.nota}>
            * Al continuar, pasarás a grabar la conversación con el cliente para dejar todo el acuerdo registrado.
          </Text>

          <TouchableOpacity
            style={[styles.btnPrimary, createMutation.isPending && styles.btnDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="mic-outline" size={20} color="#0A0A0A" />
                <Text style={styles.btnPrimaryText}>Continuar a Grabación</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { padding: 20, paddingBottom: 40 },
  userBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1C1C1C", borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, alignSelf: "flex-start", marginBottom: 20,
    borderWidth: 1, borderColor: "#2A2A2A",
  },
  userText: { fontSize: 12, color: "#C9A84C", fontWeight: "600" },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#C9A84C",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },
  input: {
    backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: "#F5F5F5", fontSize: 14, marginBottom: 10,
  },
  nota: { fontSize: 12, color: "#555555", lineHeight: 18, marginBottom: 24, fontStyle: "italic" },
  btnPrimary: {
    backgroundColor: "#C9A84C", borderRadius: 10, paddingVertical: 15,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
});
