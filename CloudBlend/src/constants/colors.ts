export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F8F5F2",
    card: "#FFFFFF",
    elevatedCard: "#FBF7F4",

    primary: "#D86B2B",
    primaryDark: "#A9471D",
    primaryLight: "#F7E1D4",

    brown: "#4B2B20",
    brownDark: "#281712",
    brownLight: "#8C6252",

    text: "#1D1714",
    textSecondary: "#756962",
    muted: "#A59B95",

    border: "#ECE6E2",
    divider: "#F0EBE7",

    success: "#5B9A58",
    warning: "#F0A51A",
    danger: "#D95242",

    tabBar: "#FFFFFF",
    tabInactive: "#8C827C",
  },

  dark: {
    background: "#130F0C",
    surface: "#1D1713",
    card: "#271E19",
    elevatedCard: "#30231D",

    primary: "#E17B43",
    primaryDark: "#B95225",
    primaryLight: "#4C2A1D",

    brown: "#D8B4A3",
    brownDark: "#0D0907",
    brownLight: "#AA8170",

    text: "#FFFFFF",
    textSecondary: "#C8BBB4",
    muted: "#92847D",

    border: "#3B2D26",
    divider: "#322720",

    success: "#79B975",
    warning: "#F4B640",
    danger: "#E66E61",

    tabBar: "#1A1411",
    tabInactive: "#8F827B",
  },
}

export type AppTheme = typeof colors.light