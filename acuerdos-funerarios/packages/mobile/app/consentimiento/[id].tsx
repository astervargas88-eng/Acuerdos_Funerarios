import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../lib/api";

export default function ConsentimientoScreen() {
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre: string }>();
  const router = useRouter();
  const [aceptado, setAceptado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAceptar = async () => {
    if (!aceptado) return;
    setLoading(true);
    try {
      await apiFetch(`/acuerdos/${id}/consentimiento`, { method: "POST" });
      router.replace(`/grabacion/${id}`);
    } catch {
      setLoading(false);
    }
  };

  const handleRechazar = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
          />
        </View>

        {/* Encabezado */}
        <View style={styles.headerCard}>
          <View style={styles.iconRow}>
            <View style={styles.iconBg}>
              <Ionicons name="shield-checkmark-outline" size={28} color="#C9A84C" />
            </View>
          </View>
          <Text style={styles.title}>Autorización de Grabación</Text>
          <Text style={styles.subtitle}>
            Tratamiento de Datos Personales
          </Text>
          <Text style={styles.ley}>Ley 1581 de 2012 · Decreto 1377 de 2013</Text>
        </View>

        {/* Cuerpo legal */}
        <View style={styles.legalCard}>
          <Text style={styles.legalTitle}>AUTORIZACIÓN PARA GRABACIÓN Y TRATAMIENTO DE DATOS</Text>
          <Text style={styles.legalText}>
            En cumplimiento de la{" "}
            <Text style={styles.bold}>Ley Estatutaria 1581 de 2012</Text> y el{" "}
            <Text style={styles.bold}>Decreto 1377 de 2013</Text>, reglamentarios
            del Habeas Data en Colombia, el titular{" "}
            <Text style={styles.highlight}>{nombre ?? "del presente acuerdo"}</Text>{" "}
            autoriza expresamente a <Text style={styles.bold}>SERFUNCOOP</Text> para:
          </Text>

          <View style={styles.listItem}>
            <Ionicons name="mic-outline" size={16} color="#C9A84C" style={styles.listIcon} />
            <Text style={styles.listText}>
              <Text style={styles.bold}>Grabar la conversación</Text> que se realizará
              con el asesor comercial como constancia del acuerdo de servicio funerario pactado.
            </Text>
          </View>

          <View style={styles.listItem}>
            <Ionicons name="document-text-outline" size={16} color="#C9A84C" style={styles.listIcon} />
            <Text style={styles.listText}>
              <Text style={styles.bold}>Transcribir y almacenar</Text> el contenido
              de la grabación de voz para generar el registro del acuerdo de servicio.
            </Text>
          </View>

          <View style={styles.listItem}>
            <Ionicons name="analytics-outline" size={16} color="#C9A84C" style={styles.listIcon} />
            <Text style={styles.listText}>
              <Text style={styles.bold}>Procesar la información</Text> mediante
              herramientas de inteligencia artificial para extraer y documentar los
              servicios funerarios pactados.
            </Text>
          </View>

          <View style={styles.listItem}>
            <Ionicons name="lock-closed-outline" size={16} color="#C9A84C" style={styles.listIcon} />
            <Text style={styles.listText}>
              <Text style={styles.bold}>Conservar el registro</Text> de forma segura
              en los sistemas de SERFUNCOOP, con acceso restringido al personal
              autorizado y por el tiempo necesario para el cumplimiento del servicio.
            </Text>
          </View>

          <View style={styles.separator} />

          <Text style={styles.legalText}>
            <Text style={styles.bold}>Finalidad:</Text> La grabación tiene como único
            propósito dejar constancia fiel de los acuerdos comerciales pactados entre
            las partes y facilitar la prestación del servicio funerario contratado.
          </Text>

          <View style={styles.separator} />

          <Text style={styles.legalText}>
            <Text style={styles.bold}>Derechos del titular:</Text> En virtud del
            artículo 8 de la Ley 1581 de 2012, el titular podrá en cualquier momento
            conocer, actualizar, rectificar y solicitar la supresión de sus datos
            personales, así como revocar la presente autorización, comunicándose
            con SERFUNCOOP a través de los canales oficiales de atención.
          </Text>

          <View style={styles.separator} />

          <Text style={styles.legalText}>
            <Text style={styles.bold}>Responsable:</Text> SERFUNCOOP — Cooperativa
            de Servicios Funerarios. El tratamiento de datos se realiza conforme a
            la Política de Tratamiento de Datos Personales de la cooperativa,
            disponible en nuestras oficinas.
          </Text>

          <View style={styles.separator} />

          <Text style={styles.legalNote}>
            Al presionar "Acepto y autorizo la grabación", el titular manifiesta
            haber leído, comprendido y aceptado voluntariamente la presente
            autorización, otorgando su consentimiento libre, previo, expreso e
            informado, conforme a lo establecido en la normativa colombiana vigente.
          </Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAceptado((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, aceptado && styles.checkboxActive]}>
            {aceptado && <Ionicons name="checkmark" size={14} color="#0A0A0A" />}
          </View>
          <Text style={styles.checkLabel}>
            He leído y acepto la autorización de grabación y tratamiento de datos
            personales de conformidad con la legislación colombiana vigente.
          </Text>
        </TouchableOpacity>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleRechazar}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>No autorizo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, (!aceptado || loading) && styles.btnDisabled]}
            onPress={handleAceptar}
            disabled={!aceptado || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" size="small" />
            ) : (
              <>
                <Ionicons name="mic" size={18} color="#0A0A0A" />
                <Text style={styles.btnPrimaryText}>Acepto y autorizo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Este registro de consentimiento queda almacenado con fecha, hora y datos de
          conexión como evidencia del acuerdo, conforme al artículo 7 de la Ley 1581 de 2012.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { padding: 20, paddingBottom: 48 },
  logoRow: { alignItems: "center", marginBottom: 16 },
  logo: { width: 100, height: 53, resizeMode: "contain", opacity: 0.85 },
  headerCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#C9A84C22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconRow: { marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#F5F5F5", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#9A9A9A", marginTop: 4, textAlign: "center" },
  ley: {
    fontSize: 11,
    color: "#C9A84C",
    fontWeight: "600",
    marginTop: 8,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  legalCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  legalTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C9A84C",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    textAlign: "center",
  },
  legalText: { fontSize: 13, color: "#9A9A9A", lineHeight: 21, marginBottom: 10 },
  legalNote: {
    fontSize: 12,
    color: "#C9A84C",
    lineHeight: 19,
    fontStyle: "italic",
    textAlign: "center",
  },
  bold: { fontWeight: "700", color: "#F5F5F5" },
  highlight: { color: "#C9A84C", fontWeight: "600" },
  listItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  listIcon: { marginRight: 10, marginTop: 2 },
  listText: { fontSize: 13, color: "#9A9A9A", lineHeight: 20, flex: 1 },
  separator: { height: 1, backgroundColor: "#2A2A2A", marginVertical: 12 },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#555555",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: "#C9A84C", borderColor: "#C9A84C" },
  checkLabel: { fontSize: 13, color: "#9A9A9A", lineHeight: 19, flex: 1 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  btnPrimary: {
    flex: 2,
    backgroundColor: "#C9A84C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimaryText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    flex: 1,
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  btnSecondaryText: { color: "#9A9A9A", fontWeight: "600", fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  footerNote: {
    fontSize: 11,
    color: "#3A3A3A",
    textAlign: "center",
    lineHeight: 17,
    fontStyle: "italic",
  },
});
