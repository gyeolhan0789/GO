/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerFcmBackgroundHandler } from './src/features/notification/model/fcmBackgroundHandler';

registerFcmBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
