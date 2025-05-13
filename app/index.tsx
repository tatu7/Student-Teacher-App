import { Redirect } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Root() {
	useEffect(() => {
		// Setup initial deep link handler
		const initLinking = async () => {
			// Get the initial URL that was used to open the app
			const initialUrl = await Linking.getInitialURL();
			if (initialUrl) {
				// Check if it's an auth confirmation link
				if (initialUrl.includes("auth/confirm")) {
					console.log("Initial URL is an auth confirmation link");
				}
			}
		};

		initLinking();
	}, []);

	// Redirect to the login screen by default
	return <Redirect href='/auth/login' />;
}
