import { DataTable, type DataTableColumn, ThemedButton } from '@repo/ui';
import type React from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
}

const sampleData: Person[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
];

const columns: DataTableColumn<Person>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

function App(): React.JSX.Element {
  const [clickCount, setClickCount] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#333333' }}>
        React Native Desktop App
      </Text>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#555555' }}>
          ThemedButton Component
        </Text>
        <ThemedButton
          title={`Clicked ${String(clickCount)} times`}
          onPress={() => setClickCount((c) => c + 1)}
        />
      </View>

      <View>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#555555' }}>
          DataTable Component
        </Text>
        <Text style={{ fontSize: 12, marginBottom: 12, color: '#888888' }}>
          Click column headers to sort
        </Text>
        <DataTable
          data={sampleData}
          columns={columns}
          keyExtractor={(person) => String(person.id)}
        />
      </View>
    </View>
  );
}

export default App;
