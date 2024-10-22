import React, { useRef, useState, useEffect } from "react";
import { View, Button, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { Zpl } from "react-native-zpl-code";
import Net from "react-native-tcp-socket";

const App = () => {
  const webViewRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState("");

  // Monitor URL changes in the WebView
  const handleWebViewNavigationStateChange = (newNavState) => {
    const { url } = newNavState;
    setCurrentUrl(url);

    // If the URL contains 'print', automatically trigger ZPL generation
    if (url.includes("print")) {
      handleGenerateZPL(url);
    }
  };

  const handleGenerateZPL = async (url) => {
    try {
      // Extract content from WebView (if needed) - let's assume the invoice info is in the URL
      const extractedHtml = await webViewRef.current.injectJavaScript(`
        (function() {
        const inv = document.documentElement.outerHTML;
        window.ReactNativeWebView.postMessage(inv);
        window.history.back();
        return inv;
        })();
      `);

      // Manually convert HTML to ZPL (for simplicity, I'll manually handle text conversion here)
      const zplBuilder = new Zpl.Builder();

      // Setup label configuration for ZPL
      zplBuilder.setup({
        size: { heightDots: 609, widthDots: 609 },
        labelHome: { x: 0, y: 0 },
        orientation: "NORMAL",
        media: { type: "MARK_SENSING", dots: 24 },
      });

      console.log(url);
      const urlParams = new URLSearchParams(url);
      const img = urlParams.get("img");

      // Handle image URL from the parameters
      const imageData = await fetchAndConvertImageToZPL(
        "http://192.168.8.174:5500/print/1.png"
      ); // Assuming it's an image URL
      zplBuilder.image({
        x: 50,
        y: 50,
        data: imageData,
      });

      // Generate the ZPL command
      const zplCommandObj = zplBuilder.build();

      // Extract the ZPL string from the object
      const zplCommand = zplCommandObj._j;

      if (typeof zplCommand !== "string") {
        throw new Error("Failed to extract ZPL command string");
      }

      console.log("Generated ZPL:", zplCommand);
      console.log("Url:", url);

      // Send the ZPL command to the printer
      sendToPrinter(zplCommand);
    } catch (error) {
      Alert.alert("Error", "Failed to generate ZPL");
      console.error(error);
    }
  };

  // Function to fetch and convert an image URL to ZPL format
  const fetchAndConvertImageToZPL = async (imageUrl) => {
    try {
      console.error(imageUrl);
      // Fetch the image data
      const response = await fetch(imageUrl);
      console.log(response.blob());
      const blob = await response.blob();

      // Convert the image to a ZPL-compatible format (using base64 encoding)
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result;
          const zplImageData = convertBase64ToZPL(base64data); // Convert to ZPL format
          resolve(zplImageData);
        };
        reader.onerror = reject;
      });
    } catch (error) {
      console.error("Error fetching and converting image:", error);
      throw error;
    }
  };

  // Convert base64 data to ZPL format (custom function, adjust as necessary)
  const convertBase64ToZPL = (base64data) => {
    // Assuming that base64 is correctly converted to ZPL format
    // You may need to apply additional formatting based on your ZPL requirements
    const zplImageData = `^GFA,${base64data}`;
    return zplImageData;
  };

  const handleMessage = (event) => {
    invoice = event.nativeEvent.data;
  };

  const sendToPrinter = (zplCommandString) => {
    const client = Net.createConnection(
      { host: "192.168.1.100", port: 9100 },
      () => {
        // Send the ZPL string to the printer
        client.write(zplCommandString, "utf-8");
        client.end();
      }
    );

    client.on("data", (data) => {
      console.log("Printer response:", data.toString());
    });

    client.on("error", (error) => {
      Alert.alert("Error", "Failed to connect to printer");
      console.error(error);
    });

    client.on("close", () => {
      console.log("Connection closed");
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* WebView displaying the invoice */}
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        cacheEnabled={false}
        source={{ uri: "http://192.168.8.174:5500" }} // Update with the correct invoice URL
        style={{ flex: 1 }}
        onNavigationStateChange={handleWebViewNavigationStateChange}
      />

      {/* Button to trigger ZPL generation manually (optional) */}
      <Button title="Generate ZPL Manually" onPress={handleGenerateZPL} />
    </View>
  );
};

export default App;
