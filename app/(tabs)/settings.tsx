import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { darkColors, lightColors } from "@/constants/Colors";
import Page from "@/components/ui/Page";

export default function SettingsScreen() {
    const { theme, setTheme, isSystemTheme } = useTheme();
    const colors = theme === "dark" ? darkColors : lightColors;
    const styles = getDynamicStyles(colors);

    const options = [
        { key: "light", label: "Light", icon: "sun" },
        { key: "dark", label: "Dark", icon: "moon" },
        { key: "system", label: "System", icon: "smartphone" },
    ];

    const getOptionStyle = (key) => {
        const isActive = (key === "system" && isSystemTheme) ||
            (key !== "system" && !isSystemTheme && theme === key);
        return [
            styles.optionButton,
            isActive && styles.optionButtonActive,
        ];
    };

    const getOptionTextStyle = (key) => {
        const isActive = (key === "system" && isSystemTheme) ||
            (key !== "system" && !isSystemTheme && theme === key);
        return [
            styles.optionText,
            isActive && styles.optionTextActive,
        ];
    };

    return (
        <Page style={styles.page}>
            <View style={styles.content}>
                <View style={styles.settingCard}>
                    <Text style={styles.settingLabel}>Theme</Text>
                    <View style={styles.optionsContainer}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={getOptionStyle(option.key)}
                                onPress={() =>
                                    setTheme(
                                        option.key as
                                            | "light"
                                            | "dark"
                                            | "system",
                                    )}
                            >
                                <Feather
                                    name={option.icon}
                                    size={20}
                                    color={getOptionTextStyle(option.key)[1]
                                        ?.color || colors.text}
                                />
                                <Text style={getOptionTextStyle(option.key)}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Page>
    );
}

const getDynamicStyles = (colors) =>
    StyleSheet.create({
        page: {
            paddingHorizontal: 0,
        },
        header: {
            paddingVertical: 20,
            paddingHorizontal: 20,
        },
        title: {
            fontSize: 32,
            fontWeight: "bold",
            color: colors.text,
        },
        content: {
            padding: 20,
        },
        settingCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
        },
        settingLabel: {
            fontSize: 18,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 15,
        },
        optionsContainer: {
            flexDirection: "row",
            backgroundColor: colors.accent,
            borderRadius: 10,
            padding: 4,
        },
        optionButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
        },
        optionButtonActive: {
            backgroundColor: colors.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        optionText: {
            fontSize: 16,
            color: colors.text,
            fontWeight: "500",
        },
        optionTextActive: {
            color: colors.primary,
            fontWeight: "bold",
        },
    });
