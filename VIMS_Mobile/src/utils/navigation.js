export const safeGoBack = (navigation, fallbackRoute = 'DashboardTab') => {
  if (navigation?.canGoBack?.()) {
    navigation.goBack();
    return;
  }

  navigation?.navigate?.(fallbackRoute);
};
