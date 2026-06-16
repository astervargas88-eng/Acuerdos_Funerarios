import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Switch, Platform, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import SignaturePad, { SignaturePadRef } from "../../components/SignaturePad";

type Servicio = { servicio: string; detalle: string; valor: string | null };

type AcuerdoDetail = {
  id: number;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  asesorNombre: string;
  estado: string;
  fechaAcuerdo: string;
  fallecidoNombre?: string | null;
  resumen?: string | null;
  serviciosPactados?: string | null;
  firmaNombreResponsable?: string | null;
  firmaFecha?: string | null;
  firmaBase64?: string | null;
};

export default function FirmaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sigRef = useRef<SignaturePadRef>(null);

  const [firmaBase64, setFirmaBase64] = useState<string | null>(null);
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [firmado, setFirmado] = useState(false);
  // Controls whether ScrollView responds to touch (disabled while drawing)
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["acuerdo", id],
    queryFn: () => apiFetch<{ acuerdo: AcuerdoDetail }>(`/acuerdos/${id}`),
  });

  const firmarMutation = useMutation({
    mutationFn: async () => {
      if (!firmaBase64) throw new Error("Por favor firma en el recuadro antes de continuar");
      if (!nombreResponsable.trim()) throw new Error("Ingresa el nombre del responsable que firma");
      if (!aceptaDatos) throw new Error("Debes aceptar el tratamiento de datos personales para continuar");

      return apiFetch(`/acuerdos/${id}/firma`, {
        method: "POST",
        body: JSON.stringify({
          firmaBase64,
          firmaNombreResponsable: nombreResponsable.trim(),
          consentimientoDatos: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acuerdo", id] });
      queryClient.invalidateQueries({ queryKey: ["acuerdos"] });
      queryClient.invalidateQueries({ queryKey: ["acuerdos-historial"] });
      setFirmado(true);
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const handleClear = () => {
    sigRef.current?.clear();
    setFirmaBase64(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color="#C9A84C" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const acuerdo = data?.acuerdo;
  if (!acuerdo) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Acuerdo no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Guard: acuerdo ya firmado → pantalla de solo lectura
  if (acuerdo.estado === "firmado") {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={72} color="#3498DB" />
          </View>
          <Text style={styles.successTitle}>Acuerdo ya firmado</Text>
          {acuerdo.firmaNombreResponsable ? (
            <>
              <Text style={styles.successSub}>Este acuerdo fue firmado por:</Text>
              <Text style={[styles.successSub, { color: "#C9A84C", fontWeight: "700", marginTop: -16 }]}>
                {acuerdo.firmaNombreResponsable}
              </Text>
            </>
          ) : (
            <Text style={styles.successSub}>Este acuerdo ya cuenta con firma registrada.</Text>
          )}
          {acuerdo.firmaBase64 ? (
            <View style={styles.firmaPreviewBox}>
              <Text style={styles.firmaPreviewLabel}>Firma registrada</Text>
              <Image
                source={{ uri: acuerdo.firmaBase64 }}
                style={styles.firmaPreviewImg}
                resizeMode="contain"
              />
            </View>
          ) : null}
          {acuerdo.firmaFecha ? (
            <Text style={styles.firmaFechaText}>
              {"Fecha: "}
              {new Date(acuerdo.firmaFecha).toLocaleDateString("es-CO", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.replace(`/acuerdo/${id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#0A0A0A" />
            <Text style={styles.btnPrimaryText}>Ver orden de servicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  let servicios: Servicio[] = [];
  try { servicios = JSON.parse(acuerdo.serviciosPactados ?? "[]"); } catch { /* ignore */ }

  if (firmado) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color="#27AE60" />
          </View>
          <Text style={styles.successTitle}>Acuerdo firmado</Text>
          <Text style={styles.successSub}>
            {"El acuerdo ha quedado registrado con la firma manuscrita de\n"}
            <Text style={{ color: "#C9A84C", fontWeight: "700" }}>{nombreResponsable}</Text>
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.replace(`/acuerdo/${id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#0A0A0A" />
            <Text style={styles.btnPrimaryText}>Ver orden de servicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
      >
        {/* Encabezado */}
        <View style={styles.headerBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#C9A84C" />
          <Text style={styles.headerTitle}>Firma del Acuerdo</Text>
        </View>
        <Text style={styles.headerSub}>
          El familiar responsable debe revisar los datos y firmar para dejar constancia del acuerdo pactado.
        </Text>

        {/* Resumen del acuerdo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATOS DEL ACUERDO</Text>
          <View style={styles.infoCard}>
            <Row icon="person-outline" label="Cliente" value={acuerdo.clienteNombre} />
            <Row icon="card-outline" label="Cédula" value={acuerdo.clienteCedula} />
            <Row icon="call-outline" label="Teléfono" value={acuerdo.clienteTelefono} />
            <Row icon="person-outline" label="Asesor" value={acuerdo.asesorNombre} />
            {acuerdo.fallecidoNombre ? (
              <Row icon="ribbon-outline" label="Ser querido" value={acuerdo.fallecidoNombre} />
            ) : null}
            <Row
              icon="calendar-outline"
              label="Fecha"
              value={new Date(acuerdo.fechaAcuerdo).toLocaleDateString("es-CO", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            />
          </View>
        </View>

        {/* Servicios */}
        {servicios.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SERVICIOS PACTADOS</Text>
            {servicios.map((s, i) => (
              <View key={i} style={styles.servicioRow}>
                <Text style={styles.servicioNum}>{i + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.servicioName}>{s.servicio}</Text>
                  <Text style={styles.servicioDetalle}>{s.detalle}</Text>
                  {s.valor ? <Text style={styles.servicioValor}>{s.valor}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Resumen IA */}
        {acuerdo.resumen ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RESUMEN DEL ACUERDO</Text>
            <View style={styles.infoCard}>
              <Text style={styles.bodyText}>{acuerdo.resumen}</Text>
            </View>
          </View>
        ) : null}

        {/* Autorización */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AUTORIZACIÓN TRATAMIENTO DE DATOS</Text>
          <View style={styles.consentBox}>
            <Text style={styles.consentText}>
              {"De conformidad con la "}
              <Text style={styles.consentBold}>Ley 1581 de 2012</Text>
              {" y el Decreto 1377 de 2013, autorizo expresamente a "}
              <Text style={styles.consentBold}>Los Olivos Ibagué</Text>
              {" para recolectar, almacenar, usar y tratar mis datos personales con la finalidad de registrar, gestionar y dar cumplimiento al presente acuerdo de servicio funerario.\n\nLos datos podrán ser conservados durante el tiempo necesario para cumplir las obligaciones legales y contractuales derivadas del servicio. Tengo derecho a conocer, actualizar, rectificar y suprimir mis datos en cualquier momento."}
            </Text>
            <View style={styles.switchRow}>
              <Switch
                value={aceptaDatos}
                onValueChange={setAceptaDatos}
                trackColor={{ false: "#2A2A2A", true: "#27AE6066" }}
                thumbColor={aceptaDatos ? "#27AE60" : "#555"}
              />
              <Text style={[styles.switchLabel, aceptaDatos && { color: "#27AE60" }]}>
                {aceptaDatos ? "Autorización otorgada" : "Acepto el tratamiento de mis datos personales"}
              </Text>
            </View>
          </View>
        </View>

        {/* Nombre del responsable */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOMBRE DEL RESPONSABLE QUE FIRMA</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo del familiar responsable"
            placeholderTextColor="#555"
            value={nombreResponsable}
            onChangeText={setNombreResponsable}
          />
        </View>

        {/* Canvas de firma */}
        <View style={styles.section}>
          <View style={styles.sigHeader}>
            <Text style={styles.sectionLabel}>FIRMA MANUSCRITA</Text>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Ionicons name="refresh-outline" size={14} color="#C9A84C" />
              <Text style={styles.clearText}>Borrar</Text>
            </TouchableOpacity>
          </View>

          {/* Instruction hint */}
          <Text style={styles.sigHint}>
            Dibuja tu firma dentro del recuadro. La página no se moverá mientras firmas.
          </Text>

          <View
            style={styles.sigContainer}
            // On web: disable ScrollView scroll while finger is inside the pad
            onStartShouldSetResponder={() => {
              setScrollEnabled(false);
              return false; // let the canvas handle the event
            }}
            onResponderRelease={() => setScrollEnabled(true)}
            onResponderTerminate={() => setScrollEnabled(true)}
          >
            <SignaturePad
              ref={sigRef}
              onSigned={(base64) => {
                setFirmaBase64(base64);
                setScrollEnabled(true);
              }}
              height={220}
            />
            {!firmaBase64 ? (
              <View style={styles.sigPlaceholder} pointerEvents="none">
                <Ionicons name="create-outline" size={28} color="#2A2A2A" />
                <Text style={styles.sigPlaceholderText}>Dibuja tu firma aquí</Text>
              </View>
            ) : null}
          </View>

          {/* On native: button to read signature from WebView canvas */}
          {Platform.OS !== "web" ? (
            <TouchableOpacity
              style={styles.btnCapture}
              onPress={() => (sigRef.current as any)?.readSignature?.()}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-outline" size={16} color="#C9A84C" />
              <Text style={styles.btnCaptureText}>Confirmar firma</Text>
            </TouchableOpacity>
          ) : null}

          {firmaBase64 ? (
            <View style={styles.sigOk}>
              <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
              <Text style={styles.sigOkText}>Firma capturada correctamente</Text>
            </View>
          ) : null}
        </View>

        {/* Botón final */}
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            { marginHorizontal: 0, marginBottom: 32 },
            firmarMutation.isPending && styles.btnDisabled,
          ]}
          onPress={() => firmarMutation.mutate()}
          disabled={firmarMutation.isPending}
          activeOpacity={0.8}
        >
          {firmarMutation.isPending ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <>
              <Ionicons name="create-outline" size={20} color="#0A0A0A" />
              <Text style={styles.btnPrimaryText}>Registrar firma y cerrar acuerdo</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={13} color="#C9A84C" />
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { padding: 18, paddingTop: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  headerBox: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#F5F5F5" },
  headerSub: { fontSize: 13, color: "#9A9A9A", lineHeight: 19, marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  infoCard: { backgroundColor: "#141414", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#2A2A2A", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLabel: { fontSize: 12, color: "#555", minWidth: 72 },
  rowValue: { fontSize: 13, color: "#F5F5F5", flex: 1 },
  servicioRow: { flexDirection: "row", gap: 10, backgroundColor: "#1C1C1C", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#2A2A2A" },
  servicioNum: { fontSize: 13, fontWeight: "700", color: "#C9A84C", marginTop: 1 },
  servicioName: { fontSize: 13, fontWeight: "600", color: "#F5F5F5", marginBottom: 2 },
  servicioDetalle: { fontSize: 12, color: "#9A9A9A", lineHeight: 17 },
  servicioValor: { fontSize: 12, color: "#C9A84C", fontWeight: "600", marginTop: 3 },
  bodyText: { fontSize: 13, color: "#9A9A9A", lineHeight: 20 },
  consentBox: { backgroundColor: "#141414", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "#2A2A2A" },
  consentText: { fontSize: 12, color: "#9A9A9A", lineHeight: 19, marginBottom: 16 },
  consentBold: { color: "#F5F5F5", fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { fontSize: 13, color: "#9A9A9A", flex: 1, lineHeight: 18 },
  input: {
    backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: "#F5F5F5", fontSize: 14,
  },
  sigHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sigHint: { fontSize: 11, color: "#555", marginBottom: 10, fontStyle: "italic" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  clearText: { fontSize: 12, color: "#C9A84C" },
  sigContainer: {
    height: 220, borderRadius: 10, overflow: "hidden",
    borderWidth: 2, borderColor: "#2A2A2A", backgroundColor: "#1C1C1C",
    position: "relative",
  },
  sigPlaceholder: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center", gap: 8,
  },
  sigPlaceholderText: { fontSize: 13, color: "#2A2A2A" },
  btnCapture: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: "#C9A84C44", borderRadius: 8,
    paddingVertical: 10, marginTop: 10,
  },
  btnCaptureText: { fontSize: 13, color: "#C9A84C", fontWeight: "600" },
  sigOk: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  sigOkText: { fontSize: 12, color: "#27AE60" },
  btnPrimary: {
    backgroundColor: "#C9A84C", borderRadius: 10, paddingVertical: 16,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
  emptyText: { color: "#9A9A9A" },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#F5F5F5", marginBottom: 12 },
  successSub: { fontSize: 14, color: "#9A9A9A", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  firmaPreviewBox: {
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    padding: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  firmaPreviewLabel: { fontSize: 11, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  firmaPreviewImg: { width: 220, height: 110, backgroundColor: "#FFFFFF", borderRadius: 6 },
  firmaFechaText: { fontSize: 13, color: "#9A9A9A", marginBottom: 24 },
});
