import Slider from '@react-native-community/slider';
import { ResizeMode, Video } from "expo-av";
import * as DocumentPicker from 'expo-document-picker';
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

export default function App() {
  const videoRef = useRef<Video>(null);

  const [tilt, setTilt] = useState({ x: 0, y: 1 });
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const yRest = useSharedValue(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const [restValue, setRestValue] = useState(0);
  
  const setRestPosition = () => {
    const newRestValue = -tilt.y;
    yRest.value = newRestValue; // Negate current tilt to offset it
    setRestValue(newRestValue);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
      });

      if (result.assets && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error picking video:', err);
    }
  };

  useEffect(() => {
    Accelerometer.setUpdateInterval(50); // update every 50 ms
    const subscription = Accelerometer.addListener(({ x, y }) => {
      // Clamp values between -5 and 5
      setTilt({ x: x, y: y });

      // Map tilt range (-5 to 5) to horizontal translation
      translateX.value = withSpring(x * 500, {
        damping: 20,
        stiffness: 30,
        mass: 1,
      });

      // Map Y tilt to scale (zoom) between 0.8 and 1.2
      const targetScale = 1 + ((y + yRest.value) * 1); // y is negative when tilting forward
      scale.value = withSpring(targetScale, {
        damping: 20,
        stiffness: 30,
      });
    });

    return () => subscription && subscription.remove();
  }, [translateX, scale, yRest]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.videoWrapper, animatedStyle]}>
        <Video
          ref={videoRef}
          source={
            videoUri
              ? { uri: videoUri }
              : { uri: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" }
          }
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
          onPlaybackStatusUpdate={(status: any) => {
            setIsPlaying(status?.isPlaying || false);
            if (!isSeeking && status?.isLoaded) {
              setPosition(status.positionMillis || 0);
              setDuration(status.durationMillis || 0);
            }
          }}
        />
      </Animated.View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            if (videoRef.current) {
              if (isPlaying) {
                await videoRef.current.pauseAsync();
              } else {
                await videoRef.current.playAsync();
              }
            }
          }}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? "Pause" : "Play"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={pickVideo}
        >
          <Text style={styles.buttonText}>Pick Video</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={setRestPosition}
        >
          <Text style={styles.buttonText}>Set Rest</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={position}
          maximumValue={duration}
          minimumValue={0}
          onSlidingStart={() => {
            setIsSeeking(true);
          }}
          onSlidingComplete={async (value) => {
            setIsSeeking(false);
            if (videoRef.current) {
              await videoRef.current.setPositionAsync(value);
            }
          }}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#666666"
          thumbTintColor="#FFFFFF"
        />
        <Text style={styles.timeText}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>

      <Animated.Text style={styles.debug}>
        Tilt X: {tilt.x.toFixed(2)} Tilt Y: {tilt.y.toFixed(2)}
        Rest Y: {(-restValue).toFixed(2)}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  videoWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    overflow: "visible",
  } as ViewStyle,
  video: {
    width: "180%",
    aspectRatio: 16 / 9,
  } as ViewStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    gap: 20,
    zIndex: 1,
  } as ViewStyle,
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  } as ViewStyle,
  buttonText: {
    color: "#fff",
    fontSize: 16,
  } as TextStyle,
  sliderContainer: {
  
    position: 'absolute',
    bottom: 20,
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  } as ViewStyle,
  slider: {
    width: '100%',
    height: 40,
  } as ViewStyle,
  timeText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  } as TextStyle,
  debug: {
    position: 'absolute',
    top: 40,
    color: '#fff',
  } as TextStyle,
});
