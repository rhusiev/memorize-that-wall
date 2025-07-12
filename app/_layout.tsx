import { ThemeProvider } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // Import this
import { LibraryProvider } from "@/context/LibraryContext";

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <LibraryProvider>
                    <Stack>
                        <Stack.Screen
                            name="(tabs)"
                            options={{ headerShown: false }}
                        />
                    </Stack>
                </LibraryProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
