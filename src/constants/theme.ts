import { ThemeConfig } from 'antd'

import { COLORS } from './colors'

export const themeConfig: ThemeConfig = {
    token: {
        colorPrimary: COLORS.PRIMARY,
        colorSuccess: COLORS.SUCCESS,
        colorWarning: COLORS.WARNING,
        colorError: COLORS.ERROR,
        colorText: COLORS.GRAY_900,
        colorTextSecondary: COLORS.GRAY_600,
        colorTextTertiary: COLORS.GRAY_500,
        colorBorder: COLORS.GRAY_200,
        colorBgContainer: '#ffffff',
        colorBgLayout: COLORS.GRAY_50,
        borderRadius: 12,
        borderRadiusLG: 16,
        borderRadiusSM: 8,
        fontSize: 14,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    components: {
        Button: {
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            borderRadiusLG: 9999,
            borderRadius: 9999,
            borderRadiusSM: 9999,
            primaryShadow: 'none',
        },
        Input: {
            controlHeight: 40,
            borderRadius: 12,
        },
        Select: {
            controlHeight: 40,
            borderRadius: 12,
        },
        Card: {
            borderRadiusLG: 16,
        },
        Modal: {
            borderRadiusLG: 20,
        },
        Tooltip: {
            borderRadius: 8,
        },
        Tabs: {
            itemSelectedColor: COLORS.PRIMARY,
            inkBarColor: COLORS.PRIMARY,
            itemHoverColor: COLORS.PRIMARY_HOVER,
        },
    },
}
