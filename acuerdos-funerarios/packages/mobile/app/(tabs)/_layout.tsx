import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, View, TouchableOpacity, Platform } from "react-native";
import { useAuth } from "../../lib/auth";
import { useRouter } from "expo-router";

function LogoHeader() {
  return (
    <View style={{ paddingVertical: 4 }}>
      <Image
        source={require("../../assets/logo.png")}
        style={{ width: 110, height: 58, resizeMode: "contain" }}
      />
    </View>
  );
}

export default function TabLayout() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    // Alert.alert no funciona en web — usar confirm nativo del navegador
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("¿Seguro que deseas cerrar sesión?")
        : await new Promise<boolean>((resolve) => {
            const { Alert } = require("react-native");
            Alert.alert("Cerrar sesión", "¿Seguro que deseas salir?", [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              { text: "Salir", style: "destructive", onPress: () => resolve(true) },
            ]);
          });

    if (confirmed) {
      await logout();
      router.replace("/login");
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#141414",
          borderTopColor: "#2A2A2A",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarActiveTintColor: "#C9A84C",
        tabBarInactiveTintColor: "#555555",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: "#0A0A0A", height: 80 },
        headerTintColor: "#C9A84C",
        headerTitleStyle: { fontWeight: "bold", color: "#F5F5F5", fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          headerTitle: () => <LogoHeader />,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16, padding: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#C9A84C" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="nuevo"
        options={{
          title: "Nuevo Acuerdo",
          headerTitle: "Nuevo Acuerdo",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16, padding: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#C9A84C" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: "Historial",
          headerTitle: "Historial de Acuerdos",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16, padding: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#C9A84C" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
