import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

export default function Index() {
  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: "Family Feud",
          headerStyle: { backgroundColor: "#1a1a2e" },
          headerTintColor: "#d4a853",
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-4xl font-semibold tracking-tight text-primary">
          Family Feud
        </Text>
        <Text className="mt-3 text-center text-base text-muted-foreground">
          Game Show
        </Text>
      </View>
    </SafeAreaView>
  );
}
