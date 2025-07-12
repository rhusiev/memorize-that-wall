import { Tabs } from "expo-router";
import React from "react";
import { Feather } from "@expo/vector-icons";

import TabBarBackground from "@/components/ui/TabBarBackground";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { TAB_BAR_HEIGHT } from "@/constants/TabBar.ts";

export default function TabLayout() {
    const { theme } = useTheme();
    const currentColors = Colors[theme];
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: currentColors.tint,
                tabBarInactiveTintColor: currentColors.textSecondary,
                headerShown: false,
                tabBarBackground: () => <TabBarBackground />,
                tabBarStyle: {
                    borderTopColor: currentColors.border,
                    backgroundColor: currentColors.card,
                    position: "absolute",
                    paddingBottom: insets.bottom,
                    height: TAB_BAR_HEIGHT + insets.bottom,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Feather name="home" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ color }) => (
                        <Feather name="layers" size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color }) => (
                        <Feather name="settings" size={26} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
