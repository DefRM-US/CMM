import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MatrixEditorScreen } from '../screens/MatrixEditorScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { ComparisonScreen } from '../screens/ComparisonScreen';

export type RootStackParamList = {
  Home: undefined;
  MatrixEditor: { matrixId: string };
  Import: undefined;
  Export: { matrixId: string };
  Comparison: { matrixIds: string[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4472C4',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Capability Matrix Management' }} />
      <Stack.Screen name="MatrixEditor" component={MatrixEditorScreen} options={{ title: 'Edit Matrix' }} />
      <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Import Excel' }} />
      <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export Matrix' }} />
      <Stack.Screen name="Comparison" component={ComparisonScreen} options={{ title: 'Compare Matrices' }} />
    </Stack.Navigator>
  );
}
