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
  fallecidoNombre?: string | null;
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: "#C9A84C",
  completado: "#27AE60",
  firmado: "#3498DB",
};

export default function HistorialScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["acuerdos-historial", debounced],
    queryFn: async () => {
      const qs = debounced ? `?q=${encodeURIComponent(debounced)}` : "";
      return apiFetch<{ acuerdos: Acuerdo[] }>(`/acuerdos${qs}`);
    },
  });

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebounced(text), 400);
  };

  const acuerdos = (data?.acuerdos ?? []) as Acuerdo[];

  const renderItem = ({ item }: { item: Acuerdo }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/acuerdo/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.dot, { backgroundColor: ESTADO_COLOR[item.estado] ?? "#555" }]} />
        <View>
          <Text style={styles.rowName}>{item.clienteNombre}</Text>
          {item.fallecidoNombre ? (
            <Text style={styles.rowSub}>Ser querido: {item.fallecidoNombre}</Text>
          ) : null}
          <Text style={styles.rowMeta}>
            CC {item.clienteCedula} · {item.asesorNombre}
          </Text>
          <Text style={styles.rowDate}>
            {new Date(item.fechaAcuerdo).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#555555" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#555555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente, cédula..."
          placeholderTextColor="#555555"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); setDebounced(""); }}>
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
          <Ionicons name="folder-open-outline" size={56} color="#2A2A2A" />
          <Text style={styles.emptyText}>No hay registros</Text>
        </View>
      ) : (
        <FlatList
          data={acuerdos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowLeft: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, marginTop: 6 },
  rowName: { fontSize: 15, fontWeight: "600", color: "#F5F5F5" },
  rowSub: { fontSize: 12, color: "#C9A84C", marginTop: 2 },
  rowMeta: { fontSize: 12, color: "#9A9A9A", marginTop: 2 },
  rowDate: { fontSize: 11, color: "#555555", marginTop: 1 },
  separator: { height: 1, backgroundColor: "#1C1C1C", marginLeft: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#555555", marginTop: 12, fontSize: 15 },
});
