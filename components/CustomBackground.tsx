import React, { ReactNode } from "react";
import {
	ImageBackground,
	StyleSheet,
	View,
	ViewStyle,
	ImageSourcePropType,
} from "react-native";

interface BackgroundProps {
	image: ImageSourcePropType;
	children: ReactNode;
	overlayColor?: string; // optional: ustiga yarim shaffof qatlam uchun
	style?: ViewStyle;
}

const CustomBackground: React.FC<BackgroundProps> = ({
	image,
	children,
	overlayColor, // default qiymat bermaymiz
	style,
}) => {
	return (
		<ImageBackground
			source={image}
			style={[styles.background, style]}
			resizeMode='cover' // aspect ratio saqlanadi, ekran to‘liq to‘ldiriladi
		>
			<View
				style={[
					styles.overlay,
					overlayColor ? { backgroundColor: overlayColor } : null,
				]}>
				{children}
			</View>
		</ImageBackground>
	);
};

const styles = StyleSheet.create({
	background: {
		flex: 1,
		width: "100%",
		height: "100%",
	},
	overlay: {
		flex: 1,
	},
});

export default CustomBackground;
