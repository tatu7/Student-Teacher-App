import { Redirect } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as SecureStore from "expo-secure-store";

type RouteType = "/onboarding" | "/" | "/auth/login";

export default function Root() {
	const [initialRoute, setInitialRoute] = useState<RouteType | null>(null);

	useEffect(() => {
		// Setup initial deep link handler and check for first app launch
		const init = async () => {
			// Get the initial URL that was used to open the app
			const initialUrl = await Linking.getInitialURL();
			if (initialUrl) {
				// Check if it's an auth confirmation link
				if (initialUrl.includes("auth/confirm")) {
					console.log("Initial URL is an auth confirmation link");
				}
			}

			// Check if it's the first time launch
			try {
				const hasLaunched = await SecureStore.getItemAsync("hasLaunchedBefore");

				if (!hasLaunched) {
					// First time launch - show onboarding
					await SecureStore.setItemAsync("hasLaunchedBefore", "true");
					setInitialRoute("/onboarding");
				} else {
					// Not first launch - check if user is logged in
					const session = await supabase.auth.session();
					if (session && session.user) {
						// User is logged in - let the auth guard handle redirection
						setInitialRoute("/");
					} else {
						// No session - show onboarding
						setInitialRoute("/onboarding");
					}
				}
			} catch (error) {
				console.error("Error checking first launch:", error);
				// Default to onboarding in case of error
				setInitialRoute("/onboarding");
			}
		};

		init();
	}, []);

	// Wait until we've determined the initial route
	if (initialRoute === null) {
		return null; // or a loading screen
	}

	// Redirect to the appropriate screen
	return <Redirect href={initialRoute} />;
}
