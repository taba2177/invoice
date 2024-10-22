import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Button,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  handleWebViewNavigationStateChange,
  handleGenerateZPL,
} from "./controllers/printController";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { getSettings } from "./utils/storage";
import SettingsScreen from "./screens/SettingsScreen";
import Icon from "react-native-vector-icons/Ionicons"; // Importing the icon

const Stack = createStackNavigator();

const HomeScreen = ({ navigation }) => {
  const webViewRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [WebViewUrl, setWebViewUrl] = useState(null); // State to hold the WebView URL from settings
  const [loading, setLoading] = useState(true); // Loading state for fetching settings
  const [error, setError] = useState(null); // Error state for handling issues

  // Fetch settings on component mount and auto-detect any changes in settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await getSettings();
        if (settings && settings.WebViewUrl) {
          setWebViewUrl(settings.WebViewUrl); // Set the URL from settings
          setError(null); // Reset error if settings are valid
        } else {
          setError("WebView URL not found in settings");
        }
      } catch (error) {
        setError("Error fetching settings");
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false); // Stop loading after fetching
      }
    }

    fetchSettings();

    // Add a listener to detect changes in settings and update WebView automatically
    const interval = setInterval(() => {
      fetchSettings();
    }, 5000); // Auto-check settings every 5 seconds

    return () => clearInterval(interval); // Cleanup the interval on unmount
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Go to Settings"
          onPress={() => navigation.navigate("Settings")}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {WebViewUrl ? (
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          onMessage={(event) =>
            console.log("Message from WebView:", event.nativeEvent.data)
          }
          javaScriptEnabled={true}
          cacheEnabled={false}
          source={{ uri: WebViewUrl }} // Use URL from settings
          style={{ flex: 1 }}
          onNavigationStateChange={(navState) =>
            handleWebViewNavigationStateChange(navState, setCurrentUrl, () =>
              handleGenerateZPL(currentUrl, webViewRef)
            )
          }
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Invalid WebView URL. Please check the settings.
          </Text>
        </View>
      )}
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#4CAF50", // Green header
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen} // Use HomeScreen as a component
          options={({ navigation }) => ({
            title: "Invoice Printer",
            headerRight: () => (
              <Icon
                name="settings"
                size={25}
                color="#fff"
                style={{ marginRight: 15 }}
                onPress={() => navigation.navigate("Settings")}
              />
            ),
          })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4CAF50",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
  },
});

export default App;
