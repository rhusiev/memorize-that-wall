import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";

export default function TabBarBackground() {
    const { theme } = useTheme();

    return (
        <BlurView
            intensity={95}
            tint={theme}
            style={[
                StyleSheet.absoluteFill,
                {
                    backgroundColor: Colors[theme].card + "99",
                },
            ]}
        />
    );
}
