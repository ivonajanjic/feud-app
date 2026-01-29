import { SafeAreaView, Text, View } from "react-native";
import { Stack, useGlobalSearchParams } from "expo-router";

// Placeholder page - not used in Family Feud Go prototype
export default function Post() {
  const { id } = useGlobalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: `Post ${id}` }} />
      <View className="h-full w-full items-center justify-center p-4">
        <Text className="text-primary py-2 text-xl font-bold">
          Page not available in prototype
        </Text>
      </View>
    </SafeAreaView>
  );
}
