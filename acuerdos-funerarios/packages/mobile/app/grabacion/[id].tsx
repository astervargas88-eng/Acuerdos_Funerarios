import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getBaseUrl } from "../../lib/api";

type Phase =
  | "listo"
  | "grabando"
  | "detenido"
  | "subiendo"
  | "transcribiendo"
  | "analizando"
  | "listo_sin_audio";

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GrabacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("listo");
  const [duration, setDuration] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Solicitar permisos al montar
    if (Platform.OS !== "web") {
      Audio.requestPermissionsAsync().then(({ granted }) => {
        setPermGranted(granted);
        if (!granted) {
          Alert.alert(
            "Permiso de micrófono requerido",
            "Para grabar la conversación necesitas otorgar acceso al micrófono en la configuración de tu dispositivo.",
            [{ text: "Entendido" }]
          );
        }
      });
    } else {
      // En web, verificar si hay getUserMedia
      setPermGranted(true);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      pulseLoop.current?.stop();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startPulse = () => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current = loop;
    loop.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const startGrabacion = async () => {
    if (permGranted === false) {
      Alert.alert(
        "Sin permiso",
        "Otorga permiso al micrófono en la configuración del dispositivo."
      );
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setPhase("grabando");
      setDuration(0);
      startPulse();
      timerRef.current = setInterval(
        () => setDuration((d) => d + 1000),
        1000
      );
    } catch (err: any) {
      Alert.alert(
        "Error al iniciar grabación",
        err?.message ?? "No se pudo acceder al micrófono. Verifica los permisos."
      );
    }
  };

  const stopGrabacion = async () => {
    if (!recordingRef.current) return;
    stopPulse();
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      setPhase("detenido");
    } catch (err: any) {
      Alert.alert("Error", "No se pudo detener la grabación: " + err?.message);
    }
  };

  const uploadAndProcess = async () => {
    if (!recordingRef.current) return;
    const uri = recordingRef.current.getURI();
    if (!uri) {
      Alert.alert("Error", "No se encontró el archivo de audio.");
      return;
    }

    try {
      // ── Paso 1: Subir audio ──────────────────────────────────────────────
      setPhase("subiendo");
      setStatusMsg("Subiendo grabación...");

      let audioKey = "";
      let uploadOk = false;

      // Intentar primero con upload directo (multipart)
      try {
        const fileResp = await fetch(uri);
        const blob = await fileResp.blob();

        const fd = new FormData();
        // @ts-ignore — React Native FormData acepta objeto {uri, type, name}
        // @ts-ignore
        fd.append("audio", {
          uri,
          type: "audio/m4a",
          name: `acuerdo-${id}.m4a`,
        } as unknown as Blob);

        const baseUrl = getBaseUrl();
        const uploadResp = await fetch(`${baseUrl}/api/acuerdos/${id}/audio`, {
          method: "POST",
          body: fd,
        });

        if (uploadResp.ok) {
          const data = await uploadResp.json() as { key: string };
          audioKey = data.key;
          uploadOk = true;
        } else {
          throw new Error("Upload directo falló: " + uploadResp.status);
        }
      } catch (directErr) {
        console.warn("Upload directo falló, intentando presign:", directErr);

        // Fallback: presigned URL a S3
        const { url, key } = await apiFetch<{ url: string; key: string }>(
          "/upload/presign",
          {
            method: "POST",
            body: JSON.stringify({
              filename: `acuerdo-${id}.m4a`,
              contentType: "audio/m4a",
            }),
          }
        );

        const fileResp = await fetch(uri);
        const blob = await fileResp.blob();

        const s3Resp = await fetch(url, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "audio/m4a" },
        });

        if (!s3Resp.ok) throw new Error("Error subiendo a S3: " + s3Resp.status);
        audioKey = key;
        uploadOk = true;
      }

      if (!uploadOk || !audioKey) {
        throw new Error("No se pudo subir el audio.");
      }

      // ── Paso 2: Transcribir ──────────────────────────────────────────────
      setPhase("transcribiendo");
      setStatusMsg("Transcribiendo conversación con IA...");

      const baseUrl = getBaseUrl();
      const transResp = await fetch(`${baseUrl}/api/acuerdos/${id}/transcribir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioKey }),
      });

      if (!transResp.ok) {
        const errText = await transResp.text();
        throw new Error(`Error al transcribir: ${transResp.status} ${errText}`);
      }

      // ── Paso 3: Listo ────────────────────────────────────────────────────
      setPhase("analizando");
      setStatusMsg("¡Acuerdo procesado exitosamente!");

      setTimeout(() => {
        router.replace(`/firma/${id}`);
      }, 1200);
    } catch (err: any) {
      console.error("Error en upload/transcripción:", err);
      Alert.alert(
        "Error al procesar",
        err?.message ?? "No se pudo procesar el audio. Intenta nuevamente.",
        [{ text: "Reintentar", onPress: () => setPhase("detenido") }]
      );
      setPhase("detenido");
    }
  };

  const descartarGrabacion = () => {
    Alert.alert(
      "Descartar grabación",
      "¿Seguro que deseas descartar la grabación actual?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: async () => {
            await recordingRef.current
              ?.stopAndUnloadAsync()
              .catch(() => {});
            recordingRef.current = null;
            setPhase("listo");
            setDuration(0);
          },
        },
      ]
    );
  };

  const isBusy =
    phase === "subiendo" ||
    phase === "transcribiendo" ||
    phase === "analizando";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
        />

        {/* Aviso activo de grabación */}
        {phase === "grabando" && (
          <View style={styles.recBanner}>
            <View style={styles.recDot} />
            <Text style={styles.recBannerText}>
              GRABANDO · {formatTime(duration)}
            </Text>
          </View>
        )}

        {/* Timer */}
        {phase !== "grabando" && (
          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{formatTime(duration)}</Text>
          </View>
        )}

        {/* Botón micrófono */}
        <View style={styles.micWrapper}>
          {phase === "grabando" ? (
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          ) : null}

          <TouchableOpacity
            style={[
              styles.micButton,
              phase === "grabando" && styles.micButtonActive,
              isBusy && styles.micButtonDisabled,
            ]}
            onPress={
              phase === "listo"
                ? startGrabacion
                : phase === "grabando"
                ? stopGrabacion
                : undefined
            }
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {isBusy ? (
              <ActivityIndicator color="#F5F5F5" size="large" />
            ) : phase === "grabando" ? (
              <Ionicons name="stop" size={40} color="#F5F5F5" />
            ) : (
              <Ionicons name="mic" size={40} color="#0A0A0A" />
            )}
          </TouchableOpacity>
        </View>

        {/* Instrucción */}
        <Text style={styles.instruccion}>
          {phase === "listo" &&
            "Presiona el micrófono para comenzar a grabar la conversación"}
          {phase === "grabando" &&
            "Conversación en curso — Presiona para detener"}
          {phase === "detenido" &&
            "Grabación lista — Procesa el acuerdo o graba de nuevo"}
          {phase === "subiendo" && statusMsg}
          {phase === "transcribiendo" && statusMsg}
          {phase === "analizando" && statusMsg}
        </Text>

        {/* Acciones cuando está detenido */}
        {phase === "detenido" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnDanger}
              onPress={descartarGrabacion}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color="#F5F5F5" />
              <Text style={styles.btnDangerText}>Grabar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={uploadAndProcess}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#0A0A0A" />
              <Text style={styles.btnPrimaryText}>Procesar acuerdo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card de procesamiento */}
        {isBusy && (
          <View style={styles.processingCard}>
            <Ionicons
              name={
                phase === "subiendo"
                  ? "cloud-upload-outline"
                  : phase === "transcribiendo"
                  ? "text-outline"
                  : "checkmark-circle-outline"
              }
              size={32}
              color="#C9A84C"
            />
            <Text style={styles.processingTitle}>
              {phase === "subiendo"
                ? "Subiendo audio"
                : phase === "transcribiendo"
                ? "Transcribiendo"
                : "Analizando acuerdo"}
            </Text>
            <Text style={styles.processingText}>
              {phase === "subiendo"
                ? "Tu grabación se está guardando de forma segura..."
                : phase === "transcribiendo"
                ? "La IA está convirtiendo la voz a texto en español..."
                : "Extrayendo y documentando los servicios pactados..."}
            </Text>

            {/* Barra de progreso animada */}
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      phase === "subiendo"
                        ? "33%"
                        : phase === "transcribiendo"
                        ? "66%"
                        : "100%",
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {phase === "subiendo"
                ? "1 / 3"
                : phase === "transcribiendo"
                ? "2 / 3"
                : "3 / 3"}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: {
    width: 130,
    height: 69,
    resizeMode: "contain",
    marginBottom: 24,
    opacity: 0.85,
  },
  recBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C22",
    borderWidth: 1,
    borderColor: "#E74C3C55",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
    gap: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
  },
  recBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E74C3C",
    letterSpacing: 2,
  },
  timerContainer: { alignItems: "center", marginBottom: 40 },
  timer: {
    fontSize: 60,
    fontWeight: "200",
    color: "#F5F5F5",
    letterSpacing: 4,
  },
  micWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E74C3C22",
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#C9A84C",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#C9A84C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micButtonActive: {
    backgroundColor: "#E74C3C",
    shadowColor: "#E74C3C",
  },
  micButtonDisabled: { backgroundColor: "#2A2A2A", shadowOpacity: 0 },
  instruccion: {
    fontSize: 14,
    color: "#9A9A9A",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 36,
    width: "100%",
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#C9A84C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimaryText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  btnDanger: {
    flex: 1,
    backgroundColor: "#C0392B22",
    borderWidth: 1,
    borderColor: "#C0392B",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnDangerText: { color: "#F5F5F5", fontWeight: "600", fontSize: 14 },
  processingCard: {
    marginTop: 36,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    width: "100%",
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F5F5",
    marginTop: 12,
    marginBottom: 6,
  },
  processingText: {
    fontSize: 13,
    color: "#9A9A9A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#2A2A2A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9A84C",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: "#555555",
    marginTop: 6,
  },
});
