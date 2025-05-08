import { Stack } from "expo-router";
import { View } from "react-native";

export default function AuthLayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: "#f5f5f5",
				},
				headerShadowVisible: false,
				headerBackTitle: "Back",
				contentStyle: { backgroundColor: "#f5f5f5" },
			}}
		/>
	);
}
