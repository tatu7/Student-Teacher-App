import { Stack } from "expo-router";
import { useTheme } from "@react-navigation/native";

export default function NotificationsLayout() {
	const { colors } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: colors.card,
				},
				headerTintColor: colors.text,
				headerTitleStyle: {
					fontWeight: "600",
				},
			}}>
			<Stack.Screen
				name='index'
				options={{
					title: "Notifications",
				}}
			/>
		</Stack>
	);
}
