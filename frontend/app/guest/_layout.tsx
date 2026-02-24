import { Stack } from 'expo-router';

export default function GuestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0B' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="your-stay" />
      <Stack.Screen name="around-you" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="benefits" />
      <Stack.Screen name="book-again" />
    </Stack>
  );
}
