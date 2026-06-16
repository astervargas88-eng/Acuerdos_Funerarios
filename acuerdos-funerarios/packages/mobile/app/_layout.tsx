import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { OneDollarStatsProvider } from "../lib/analytics";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider, useAuth } from "../lib/auth";
import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import appJson from "../app.json";

const queryClient = new QueryClient();
const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  // Track if we already redirected to avoid loops
  const redirected = useRef(false);

  useEffect(() => {
    // Wait until auth is resolved AND segments are available
    if (loading) return;
    if (!segments || !segments[0]) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "registro";

    if (!user && !inAuthGroup && !redirected.current) {
      redirected.current = true;
      router.replace("/login");
    } else if (user && inAuthGroup) {
      redirected.current = false;
      router.replace("/(tabs)");
    } else {
      // Valid state — reset redirect flag
      redirected.current = false;
    }
  }, [user, loading, segments]);

  // While loading auth, show spinner — never flash wrong screen
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A0A0A",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AuthGate>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: "#0A0A0A" },
                    headerTintColor: "#C9A84C",
                    headerTitleStyle: { fontWeight: "bold", color: "#F5F5F5" },
                    contentStyle: { backgroundColor: "#0A0A0A" },
                    headerShadowVisible: false,
                  }}
                >
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="registro" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="consentimiento/[id]"
                    options={{ title: "Autorización de Grabación", headerBackTitle: "Cancelar" }}
                  />
                  <Stack.Screen
                    name="grabacion/[id]"
                    options={{ title: "Grabación", headerBackTitle: "Cancelar" }}
                  />
                  <Stack.Screen
                    name="acuerdo/[id]"
                    options={{ title: "Orden de Servicio" }}
                  />
                  <Stack.Screen
                    name="firma/[id]"
                    options={{ title: "Firma del Acuerdo", headerBackTitle: "Cancelar" }}
                  />
                </Stack>
              </AuthGate>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
