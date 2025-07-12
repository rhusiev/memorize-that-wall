import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { useColorScheme as useDeviceColorScheme, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";
type ThemeContextType = {
    theme: Theme;
    setTheme: (theme: "light" | "dark" | "system") => void;
    isSystemTheme: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true);

    const deviceScheme = useDeviceColorScheme() ?? "light";
    const [theme, setThemeState] = useState<Theme>(deviceScheme);
    const [isSystemTheme, setIsSystemTheme] = useState(true);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem("app-theme");
                if (savedTheme) {
                    setThemeState(savedTheme as Theme);
                    setIsSystemTheme(false);
                } else {
                    setThemeState(deviceScheme);
                    setIsSystemTheme(true);
                }
            } catch (error) {
                console.error(
                    "Failed to load theme, using device theme.",
                    error,
                );
                setThemeState(deviceScheme);
            } finally {
                setIsLoading(false);
            }
        };

        loadTheme();
    }, [deviceScheme]);

    const setTheme = async (newTheme: "light" | "dark" | "system") => {
        try {
            if (newTheme === "system") {
                await AsyncStorage.removeItem("app-theme");
                setThemeState(deviceScheme);
                setIsSystemTheme(true);
            } else {
                await AsyncStorage.setItem("app-theme", newTheme);
                setThemeState(newTheme);
                setIsSystemTheme(false);
            }
        } catch (error) {
            console.error("Failed to save theme", error);
        }
    };

    if (isLoading) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isSystemTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
