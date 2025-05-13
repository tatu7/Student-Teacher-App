import { Stack } from "expo-router";

export default function SubmissionsLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name='index' />
			<Stack.Screen name='[id]' />
		</Stack>
	);
}
