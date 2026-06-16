import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

type Servicio = { servicio: string; detalle: string; valor: string | null };

type AcuerdoDetail = {
  id: number;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteDireccion?: string | null;
  asesorNombre: string;
  estado: string;
  fechaAcuerdo: string;
  fallecidoNombre?: string | null;
  resumen?: string | null;
  transcripcion?: string | null;
  serviciosPactados?: string | null;
  consentimientoGrabacion?: boolean | null;
  firmaNombreResponsable?: string | null;
  firmaFecha?: string | null;
  firmaBase64?: string | null;
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: "#C9A84C",
  completado: "#27AE60",
  firmado: "#3498DB",
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  completado: "Completado",
  firmado: "Firmado",
};

export default function AcuerdoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"resumen" | "transcripcion">("resumen");

  const { data, isLoading } = useQuery({
    queryKey: ["acuerdo", id],
    queryFn: () => apiFetch<{ acuerdo: AcuerdoDetail }>(`/acuerdos/${id}`),
  });

  const eliminar = useMutation({
    mutationFn: () =>
      apiFetch(`/acuerdos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acuerdos"] });
      queryClient.invalidateQueries({ queryKey: ["acuerdos-historial"] });
      router.back();
    },
  });

  const handleCompartir = async () => {
    if (!acuerdo) return;
    const servicios: Servicio[] = JSON.parse(acuerdo.serviciosPactados ?? "[]");
    const texto = `ORDEN DE SERVICIO FUNERARIO — SERFUNCOOP
━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTE: ${acuerdo.clienteNombre}
CÉDULA: ${acuerdo.clienteCedula}
TELÉFONO: ${acuerdo.clienteTelefono}
${acuerdo.clienteDireccion ? `DIRECCIÓN: ${acuerdo.clienteDireccion}\n` : ""}${acuerdo.fallecidoNombre ? `SER QUERIDO: ${acuerdo.fallecidoNombre}\n` : ""}ASESOR: ${acuerdo.asesorNombre}
FECHA: ${new Date(acuerdo.fechaAcuerdo).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
━━━━━━━━━━━━━━━━━━━━━━━━
RESUMEN DEL ACUERDO:
${acuerdo.resumen ?? "Sin resumen"}
━━━━━━━━━━━━━━━━━━━━━━━━
SERVICIOS PACTADOS:
${servicios.map((s, i) => `${i + 1}. ${s.servicio}\n   ${s.detalle}${s.valor ? `\n   Valor: ${s.valor}` : ""}`).join("\n\n")}
━━━━━━━━━━━━━━━━━━━━━━━━
Estado: ${ESTADO_LABEL[acuerdo.estado] ?? acuerdo.estado}
Generado por SERFUNCOOP`;
    await Share.share({ message: texto, title: `Acuerdo — ${acuerdo.clienteNombre}` });
  };

  const handleEliminar = () => {
    Alert.alert("Eliminar acuerdo", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => eliminar.mutate() },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.loadingText}>Cargando acuerdo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const acuerdo = data?.acuerdo;
  if (!acuerdo) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Acuerdo no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  let servicios: Servicio[] = [];
  try { servicios = JSON.parse(acuerdo.serviciosPactados ?? "[]"); } catch {}

  const estadoColor = ESTADO_COLOR[acuerdo.estado] ?? "#9A9A9A";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoBar}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
          />
        </View>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{acuerdo.clienteNombre}</Text>
              <Text style={styles.headerSub}>CC: {acuerdo.clienteCedula}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${estadoColor}22`, borderColor: estadoColor }]}>
              <Text style={[styles.badgeText, { color: estadoColor }]}>
                {ESTADO_LABEL[acuerdo.estado] ?? acuerdo.estado}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={14} color="#C9A84C" />
              <Text style={styles.metaText}>{acuerdo.clienteTelefono}</Text>
            </View>
            {acuerdo.clienteDireccion ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#C9A84C" />
                <Text style={styles.metaText}>{acuerdo.clienteDireccion}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#C9A84C" />
              <Text style={styles.metaText}>Asesor: {acuerdo.asesorNombre}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#C9A84C" />
              <Text style={styles.metaText}>
                {new Date(acuerdo.fechaAcuerdo).toLocaleDateString("es-CO", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </Text>
            </View>
            {acuerdo.fallecidoNombre ? (
              <View style={styles.metaItem}>
                <Ionicons name="ribbon-outline" size={14} color="#C9A84C" />
                <Text style={styles.metaText}>Ser querido: {acuerdo.fallecidoNombre}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Servicios Pactados */}
        {servicios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SERVICIOS PACTADOS</Text>
            {servicios.map((s, i) => (
              <View key={i} style={styles.servicioCard}>
                <View style={styles.servicioHeader}>
                  <View style={styles.servicioNum}>
                    <Text style={styles.servicioNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.servicioName}>{s.servicio}</Text>
                </View>
                <Text style={styles.servicioDetalle}>{s.detalle}</Text>
                {s.valor ? (
                  <Text style={styles.servicioValor}>{s.valor}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Tabs: Resumen / Transcripción */}
        {(acuerdo.resumen || acuerdo.transcripcion) && (
          <View style={styles.section}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "resumen" && styles.tabBtnActive]}
                onPress={() => setTab("resumen")}
              >
                <Text style={[styles.tabBtnText, tab === "resumen" && styles.tabBtnTextActive]}>
                  Resumen IA
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "transcripcion" && styles.tabBtnActive]}
                onPress={() => setTab("transcripcion")}
              >
                <Text style={[styles.tabBtnText, tab === "transcripcion" && styles.tabBtnTextActive]}>
                  Transcripción
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabContent}>
              {tab === "resumen" ? (
                <Text style={styles.bodyText}>
                  {acuerdo.resumen ?? "Sin resumen disponible."}
                </Text>
              ) : (
                <Text style={styles.bodyText}>
                  {acuerdo.transcripcion ?? "Sin transcripción disponible."}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Si está en borrador sin transcripción, opción de grabar */}
        {acuerdo.estado === "borrador" && !acuerdo.transcripcion && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.btnWarning}
              onPress={() =>
                acuerdo.consentimientoGrabacion
                  ? router.push(`/grabacion/${id}`)
                  : router.push(
                      `/consentimiento/${id}?nombre=${encodeURIComponent(acuerdo.clienteNombre)}`
                    )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="mic-outline" size={18} color="#0A0A0A" />
              <Text style={styles.btnWarningText}>Iniciar grabación</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner firma registrada */}
        {acuerdo.estado === "firmado" && (
          <View style={styles.firmaBanner}>
            <View style={styles.firmaBannerRow}>
              <Ionicons name="shield-checkmark" size={20} color="#3498DB" />
              <Text style={styles.firmaBannerTitle}>Acuerdo firmado</Text>
            </View>
            {acuerdo.firmaNombreResponsable ? (
              <Text style={styles.firmaBannerSub}>
                Firmado por: <Text style={styles.firmaBannerNombre}>{acuerdo.firmaNombreResponsable}</Text>
              </Text>
            ) : null}
            {acuerdo.firmaFecha ? (
              <Text style={styles.firmaBannerFecha}>
                {new Date(acuerdo.firmaFecha).toLocaleDateString("es-CO", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </Text>
            ) : null}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.btnShare} onPress={handleCompartir} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color="#C9A84C" />
            <Text style={styles.btnShareText}>Compartir orden</Text>
          </TouchableOpacity>

          {(acuerdo.estado === "completado" || acuerdo.estado === "borrador") && (
            <TouchableOpacity
              style={styles.btnFirmar}
              onPress={() => router.push(`/firma/${id}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#0A0A0A" />
              <Text style={styles.btnFirmarText}>Firmar acuerdo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnDelete} onPress={handleEliminar} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#C0392B" />
            <Text style={styles.btnDeleteText}>Eliminar acuerdo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  logoBar: { alignItems: "center", paddingTop: 16, paddingBottom: 4 },
  logo: { width: 120, height: 64, resizeMode: "contain", opacity: 0.9 },
  loadingText: { color: "#9A9A9A", marginTop: 12 },
  headerCard: {
    margin: 16,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#F5F5F5" },
  headerSub: { fontSize: 13, color: "#9A9A9A", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metaGrid: { gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, color: "#9A9A9A", flex: 1 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C9A84C",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  servicioCard: {
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  servicioHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  servicioNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#C9A84C22",
    alignItems: "center",
    justifyContent: "center",
  },
  servicioNumText: { fontSize: 11, fontWeight: "700", color: "#C9A84C" },
  servicioName: { fontSize: 14, fontWeight: "600", color: "#F5F5F5", flex: 1 },
  servicioDetalle: { fontSize: 13, color: "#9A9A9A", lineHeight: 19 },
  servicioValor: { fontSize: 13, color: "#C9A84C", fontWeight: "600", marginTop: 4 },
  tabBar: { flexDirection: "row", backgroundColor: "#141414", borderRadius: 10, padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabBtnActive: { backgroundColor: "#2A2A2A" },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#555555" },
  tabBtnTextActive: { color: "#F5F5F5" },
  tabContent: {
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  bodyText: { fontSize: 13, color: "#9A9A9A", lineHeight: 22 },
  actionsSection: { marginHorizontal: 16, marginBottom: 32, gap: 10 },
  btnShare: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C9A84C",
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnShareText: { color: "#C9A84C", fontWeight: "600", fontSize: 14 },
  btnFirmar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#27AE60",
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnFirmarText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  btnWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C9A84C",
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnWarningText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  btnDelete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C0392B44",
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnDeleteText: { color: "#C0392B", fontWeight: "600", fontSize: 14 },
  firmaBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#3498DB11",
    borderWidth: 1,
    borderColor: "#3498DB44",
    borderRadius: 10,
    padding: 14,
  },
  firmaBannerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  firmaBannerTitle: { fontSize: 14, fontWeight: "700", color: "#3498DB" },
  firmaBannerSub: { fontSize: 13, color: "#9A9A9A", marginTop: 2 },
  firmaBannerNombre: { color: "#F5F5F5", fontWeight: "600" },
  firmaBannerFecha: { fontSize: 12, color: "#555", marginTop: 2 },
});
