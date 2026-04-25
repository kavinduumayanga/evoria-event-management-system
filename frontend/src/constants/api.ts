// For physical device testing, replace with your machine's local IP address (e.g., 'http://192.168.1.100:5003/api')
// For iOS Simulator, 'http://localhost:5003/api' works
// For Android Emulator, 'http://10.0.2.2:5003/api' works

// Since the user is testing on iPhone 11 Pro Max using Expo Go (physical device), we should use the local IP.
export const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://evoria-api-dsdbg4eadfa0a5dy.southeastasia-01.azurewebsites.net/api';
