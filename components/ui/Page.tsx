import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { lightColors, darkColors } from '@/constants/Colors';
import { TAB_BAR_HEIGHT } from '@/constants/TabBar.ts';

interface PageProps extends ViewProps {
  children: ReactNode;
}

export default function Page({ children, style, ...props }: PageProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
