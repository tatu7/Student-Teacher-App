import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, StyleSheet, ScrollView, Dimensions, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

// O'zbekiston shaharlari
const UZBEKISTAN_LOCATIONS = {
  tashkent: {
    name: "Toshkent",
    latitude: 41.2995,
    longitude: 69.2401,
  },
  samarkand: {
    name: "Samarqand",
    latitude: 39.6541,
    longitude: 66.9597,
  },
  bukhara: {
    name: "Buxoro",
    latitude: 39.7675,
    longitude: 64.4231,
  },
  khiva: {
    name: "Xiva",
    latitude: 41.3775,
    longitude: 60.3636,
  }
};

const Home = () => {
  const router = useRouter();
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('tashkent');
  const [initialMapRegion, setInitialMapRegion] = useState(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    try {
      // Set initial map region to show all of Uzbekistan
      setInitialMapRegion({
        latitude: 41.3775,
        longitude: 64.4231,
        latitudeDelta: 5,
        longitudeDelta: 5,
      });
      setLoading(false);
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError(true);
      setLoading(false);
    }
  }, []);

  // Change selected city
  const changeCity = (cityKey) => {
    setSelectedCity(cityKey);

    // Animate map to selected city
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: UZBEKISTAN_LOCATIONS[cityKey].latitude,
        longitude: UZBEKISTAN_LOCATIONS[cityKey].longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>


      <View style={styles.mapContainer}>
        {mapError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Xarita yuklanmadi. Iltimos, qayta urinib ko'ring.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setMapError(false);
                setLoading(true);
                setTimeout(() => setLoading(false), 1000);
              }}
            >
              <Text style={styles.retryButtonText}>Qayta urinish</Text>
            </TouchableOpacity>
          </View>
        ) : initialMapRegion ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialMapRegion}
            provider={Platform.OS === 'android' ? 'google' : undefined}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            onError={(error) => {
              console.error('Map error:', error);
              setMapError(true);
            }}
          >
            {Object.entries(UZBEKISTAN_LOCATIONS).map(([key, city]) => (
              <Marker
                key={key}
                coordinate={{
                  latitude: city.latitude,
                  longitude: city.longitude,
                }}
                title={city.name}
                pinColor={key === selectedCity ? "#4A6DA7" : "red"}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A6DA7" />
          </View>
        )}
      </View>

      <View style={styles.citiesContainer}>
        <View style={styles.citiesButtonsContainer}>
          {Object.entries(UZBEKISTAN_LOCATIONS).map(([key, city]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.cityButton,
                key === selectedCity && styles.activeCityButton
              ]}
              onPress={() => changeCity(key)}
            >
              <Text style={[
                styles.cityButtonText,
                key === selectedCity && styles.activeCityButtonText
              ]}>{city.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    backgroundColor: '#4A6DA7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citiesContainer: {
    backgroundColor: 'white',
    padding: 15,
    margin: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  citiesButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  cityButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  activeCityButton: {
    backgroundColor: '#4A6DA7',
  },
  cityButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeCityButtonText: {
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A6DA7',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Home;