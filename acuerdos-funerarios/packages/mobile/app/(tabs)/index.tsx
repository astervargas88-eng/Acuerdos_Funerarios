import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

type Acuerdo = {
  id: number;
  clienteNombre: string;
  clienteCedula: string;
  asesorNombre: string;
  estado: string;
  fechaAcuerdo: string;
  resumen?: string | null;
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

export default function InicioScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["acuerdos", debouncedSearch],
    queryFn: () =>
      apiFetch<{ acuerdos: Acuerdo[] }>(
        debouncedSearch ? `/acuerdos?q=${encodeURIComponent(debouncedSearch)}` : "/acuerdos"
      ),
  });

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const acuerdos = data?.acuerdos ?? [];

  const renderItem = ({ item }: { item: Acuerdo }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/acuerdo/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="person" size={18} color="#C9A84C" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.clienteNombre}</Text>
          <Text style={styles.cardSub}>CC: {item.clienteCedula}</Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: `${ESTADO_COLOR[item.estado] ?? "#555"}22`,
              borderColor: ESTADO_COLOR[item.estado] ?? "#555",
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: ESTADO_COLOR[item.estado] ?? "#555" }]}>
            {ESTADO_LABEL[item.estado] ?? item.estado}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>Asesor: {item.asesorNombre}</Text>
        <Text style={styles.cardMeta}>
          {new Date(item.fechaAcuerdo).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      {item.resumen ? (
        <Text style={styles.cardResumen} numberOfLines={2}>
          {item.resumen}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{acuerdos.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {acuerdos.filter((a) => a.estado === "completado" || a.estado === "firmado").length}
          </Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {acuerdos.filter((a) => a.estado === "borrador").length}
          </Text>
          <Text style={styles.statLabel}>En proceso</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#555555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o cédula..."
          placeholderTextColor="#555555"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
            <Ionicons name="close-circle" size={18} color="#555555" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C9A84C" size="large" />
        </View>
      ) : acuerdos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color="#2A2A2A" />
          <Text style={styles.emptyTitle}>Sin acuerdos registrados</Text>
          <Text style={styles.emptyText}>
            Crea uno desde la pestaña{" "}
            <Text style={{ color: "#C9A84C" }}>Nuevo Acuerdo</Text>
          </Text>
        </View>
      ) : (
        <FlatList
          data={acuerdos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "bold", color: "#C9A84C" },
  statLabel: { fontSize: 11, color: "#9A9A9A", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#2A2A2A", marginVertical: 4 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#F5F5F5", fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#C9A84C22",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#F5F5F5" },
  cardSub: { fontSize: 12, color: "#9A9A9A", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { fontSize: 12, color: "#9A9A9A" },
  cardResumen: { fontSize: 12, color: "#9A9A9A", marginTop: 8, lineHeight: 17, fontStyle: "italic" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#555555", marginTop: 16 },
  emptyText: { fontSize: 13, color: "#555555", marginTop: 8, textAlign: "center" },
});
