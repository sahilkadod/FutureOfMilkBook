import React, { useContext, useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCustomers,
    fetchAndSyncFromAPI,
    removeCustomer,
    selectAllCustomers,
    selectCustomersLoading,
} from '../../redux/slices/customerSlice';
import { ThemeContext } from '../../theme/ThemeContext';
import { Menu, Provider } from 'react-native-paper';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { rf, rp, rs, buttonHeight } from '../../theme/responsive';

export default function CustomerListScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const dispatch = useDispatch();

    const customers = useSelector(selectAllCustomers);
    const loading = useSelector(selectCustomersLoading);

    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // ── Load local first, then sync from API ─────────────────────────────────
    useEffect(() => {
        dispatch(fetchCustomers());       // instant — from local SQLite
        dispatch(fetchAndSyncFromAPI());  // async — pulls from API and updates list
    }, []);

    const deleteCustomer = (customerId, customerName) => {
        Alert.alert(
            'Delete Customer',
            `Are you sure you want to delete "${customerName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => dispatch(removeCustomer(customerId)),
                },
            ]
        );
    };

    return (
        <Provider>
            <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddCustomer')}
                >
                    <MaterialIcon name="person-add" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.addButtonText}>Add Customer</Text>
                </TouchableOpacity>

                <FlatList
                    data={customers}
                    keyExtractor={(item) => (item?.id ?? item?.name ?? Math.random()).toString()}
                    contentContainerStyle={{ paddingTop: 10 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('CustomerDashboard', { customer: item })}
                            onLongPress={(e) => {
                                const { locationX, locationY } = e.nativeEvent;
                                setMenuPosition({ x: locationX + 40, y: locationY + 20 });
                                setSelectedCustomer(item);
                                setMenuVisible(true);
                            }}
                        >
                            <View style={[styles.card, { borderColor: theme.borderlineColor, backgroundColor: theme.cardBackground }]}>
                                <View style={styles.row}>
                                    <Text style={[styles.name, { color: theme.userNameColor }]}>{item.name}</Text>
                                    <Text style={styles.arrow}>›</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />

                {selectedCustomer && (
                    <Menu
                        visible={menuVisible}
                        onDismiss={() => setMenuVisible(false)}
                        anchor={{ x: menuPosition.x, y: menuPosition.y }}
                    >
                        <Menu.Item
                            leadingIcon="account-edit"
                            onPress={() => {
                                navigation.navigate('UpdateCustomer', { customer: selectedCustomer });
                                setMenuVisible(false);
                            }}
                            title="Edit Customer Details"
                        />
                        <Menu.Item
                            leadingIcon="delete"
                            onPress={() => {
                                deleteCustomer(selectedCustomer.id, selectedCustomer.name);
                                setMenuVisible(false);
                            }}
                            title="Delete Customer"
                            titleStyle={{ color: 'red' }}
                        />
                    </Menu>
                )}
            </View>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1, padding: rp(16) },
    addButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1976D2', height: buttonHeight, borderRadius: rs(8) },
    addButtonText: { color: '#fff', fontSize: rf(15), fontWeight: '600' },
    card:          { borderWidth: 1, padding: rp(14), marginVertical: rp(6), borderRadius: rs(12), elevation: 2 },
    name:          { fontWeight: '600', fontSize: rf(15) },
    row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    arrow:         { fontSize: rf(20), color: '#999' },
});