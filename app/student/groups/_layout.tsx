import { Stack } from "expo-router";

export default function GroupsLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name='index' options={{ headerShown: false }} />
			<Stack.Screen name='[id]' options={{ headerShown: false }} />
			<Stack.Screen name='task' options={{ headerShown: false }} />
		</Stack>
	);
}
