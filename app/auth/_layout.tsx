import { Stack } from "expo-router";

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
