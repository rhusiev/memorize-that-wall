import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useLibrary } from "@/context/LibraryContext";
import { useTheme } from "@/context/ThemeContext";
import { darkColors, lightColors } from "@/constants/Colors";
import Page from "@/components/ui/Page";
import {
    CoordinateSet,
    ExportedLibraryItem,
    LibraryItem,
    SavedMarkSet,
} from "@/types";
import { handlePlayRandomSavedSet, handleSelectWall } from "@/utils/library.ts";

export default function LibraryScreen() {
    const { theme } = useTheme();
    const colors = theme === "dark" ? darkColors : lightColors;
    const styles = getStyles(colors);
    const router = useRouter();
    const {
        library,
        isLoading,
        deleteImage,
        deleteCoordinates,
        deleteSavedMarkSet,
        importLibraryItem,
    } = useLibrary();
    const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleCreateNewSet = (item: LibraryItem, coordSet: CoordinateSet) => {
        router.push({
            pathname: "/",
            params: {
                imageId: item.id,
                coordsId: coordSet.id,
                createSet: "true",
            },
        });
    };

    const handleCreateNewCoordinates = (item: LibraryItem) => {
        router.push({
            pathname: "/",
            params: {
                imageId: item.id,
                createCoords: "true",
            },
        });
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/json", "application/octet-stream"], // Broad types for compatibility
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const jsonString = await FileSystem.readAsStringAsync(fileUri);
            const data = JSON.parse(jsonString);

            const importResult = await importLibraryItem(data);

            if ("error" in importResult) {
                Alert.alert("Import Failed", importResult.error);
            } else {
                Alert.alert(
                    "Import Successful",
                    `"${
                        importResult.imageUri.split("/").pop()
                    }" has been added or updated in your library.`,
                );
                setExpandedImageId(importResult.id);
            }
        } catch (e) {
            console.error(e);
            Alert.alert(
                "Import Error",
                "The selected file could not be processed. Please ensure it's a valid mtWall export file.",
            );
        } finally {
            setIsImporting(false);
        }
    };

    const handleExport = async (item: LibraryItem) => {
        try {
            const imageData = await FileSystem.readAsStringAsync(
                item.imageUri,
                {
                    encoding: FileSystem.EncodingType.Base64,
                },
            );

            const exportData: ExportedLibraryItem = {
                version: 1,
                imageFileName: item.imageUri.split("/").pop() || "image.jpg",
                imageData,
                width: item.width,
                height: item.height,
                coordinates: item.coordinates.map((coordSet) => ({
                    coords: coordSet.coords,
                    savedMarkSets: coordSet.savedMarkSets.map((
                        { name, indices },
                    ) => ({ name, indices })),
                })),
            };

            const jsonString = JSON.stringify(exportData);
            const fileName =
                (item.imageUri.split("/").pop()?.split(".")[0] || "export") +
                ".mtwall";
            const fileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert(
                    "Sharing Not Available",
                    "Sharing is not available on your device.",
                );
                return;
            }

            await Sharing.shareAsync(fileUri, {
                mimeType: "application/json",
                dialogTitle: `Export ${exportData.imageFileName}`,
                UTI: "public.json",
            });
        } catch (e) {
            console.error("Export failed", e);
            Alert.alert(
                "Export Failed",
                "An error occurred while preparing the export file.",
            );
        }
    };

    const confirmDelete = (
        title: string,
        message: string,
        onConfirm: () => void,
    ) => {
        Alert.alert(title, message, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onConfirm },
        ]);
    };

    const renderSavedSet =
        (item: LibraryItem, coordSet: CoordinateSet) =>
        (savedSet: SavedMarkSet) => (
            <View key={savedSet.id} style={styles.savedSetItem}>
                <TouchableOpacity
                    style={styles.savedSetPlayButton}
                    onPress={() =>
                        handleSelectWall(item, coordSet, router, savedSet.id)}
                >
                    <Feather name="target" size={16} color={colors.primary} />
                    <Text style={styles.playButtonTextSaved} numberOfLines={1}>
                        Play "{savedSet.name}"
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() =>
                        confirmDelete(
                            "Delete Saved Set",
                            `Are you sure you want to delete "${savedSet.name}"?`,
                            () =>
                                deleteSavedMarkSet(
                                    item.id,
                                    coordSet.id,
                                    savedSet.id,
                                ),
                        )}
                >
                    <Feather name="trash-2" size={20} color={colors.error} />
                </TouchableOpacity>
            </View>
        );

    const renderCoordSet =
        (item: LibraryItem) => (coordSet: CoordinateSet, index: number) => (
            <View key={coordSet.id} style={styles.coordSetItem}>
                <View style={styles.coordSetHeader}>
                    <Text style={styles.coordSetTitle}>
                        Coordinates {index + 1} ({coordSet.coords.length}{" "}
                        points)
                    </Text>
                    <TouchableOpacity
                        onPress={() =>
                            confirmDelete(
                                "Delete Coordinates",
                                "Are you sure you want to delete this coordinate set?",
                                () =>
                                    deleteCoordinates(item.id, coordSet.id),
                            )}
                    >
                        <Feather
                            name="trash-2"
                            size={20}
                            color={colors.error}
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handleSelectWall(item, coordSet, router)}
                >
                    <FontAwesome5
                        name="dice-three"
                        size={16}
                        color={colors.primaryText}
                    />
                    <Text style={styles.playButtonText}>
                        Play Random New Set
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.playButton,
                        styles.playRandomSavedButton,
                    ]}
                    onPress={() =>
                        handlePlayRandomSavedSet(
                            item,
                            coordSet,
                            router,
                        )}
                >
                    <Feather
                        name="shuffle"
                        size={16}
                        color={colors.primaryText}
                    />
                    <Text style={styles.playButtonText}>
                        Play Random Saved Set
                    </Text>
                </TouchableOpacity>

                <View style={styles.savedSetsContainer}>
                    <Text style={styles.savedSetsHeader}>Saved Mark Sets</Text>

                    {coordSet.savedMarkSets.length === 0
                        ? (
                            <Text style={styles.noSavedSetsText}>
                                No mark sets saved yet.
                            </Text>
                        )
                        : (
                            <>
                                {coordSet.savedMarkSets.map(
                                    renderSavedSet(item, coordSet),
                                )}
                            </>
                        )}
                    <TouchableOpacity
                        style={styles.createSetButton}
                        onPress={() => handleCreateNewSet(item, coordSet)}
                    >
                        <Feather
                            name="plus-circle"
                            size={16}
                            color={colors.primary}
                        />
                        <Text style={styles.createSetButtonText}>
                            Create New Mark Set
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );

    const renderItem = ({ item }: { item: LibraryItem }) => {
        const isExpanded = expandedImageId === item.id;
        return (
            <View style={styles.libraryItem}>
                <TouchableOpacity
                    style={styles.itemHeader}
                    onPress={() =>
                        setExpandedImageId(isExpanded ? null : item.id)}
                >
                    <Image
                        source={{ uri: item.imageUri }}
                        style={styles.thumbnail}
                    />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.imageUri.split("/").pop()}
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleExport(item)}
                        style={styles.actionIcon}
                    >
                        <Feather
                            name="share-2"
                            size={22}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() =>
                            confirmDelete(
                                "Delete Image",
                                "This will delete the image and ALL its associated data. Are you sure?",
                                () => deleteImage(item.id),
                            )}
                        style={styles.actionIcon}
                    >
                        <Feather
                            name="trash-2"
                            size={22}
                            color={colors.error}
                        />
                    </TouchableOpacity>
                    <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.detailsContainer}>
                        {item.coordinates.length > 0
                            ? (
                                item.coordinates.map(renderCoordSet(item))
                            )
                            : (
                                <Text style={styles.detailText}>
                                    No coordinate sets found. Add one from the
                                    Home tab or create one below.
                                </Text>
                            )}
                        <View style={styles.separator} />
                        <TouchableOpacity
                            style={styles.addNewCoordSetButton}
                            onPress={() => handleCreateNewCoordinates(item)}
                        >
                            <Feather
                                name="edit"
                                size={16}
                                color={colors.primary}
                            />
                            <Text style={styles.addNewCoordSetButtonText}>
                                Create New Coordinates
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (isLoading || isImporting) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator
                    size="large"
                    color={colors.primary}
                />
                <Text style={styles.loadingText}>
                    {isImporting ? "Importing file..." : "Loading library..."}
                </Text>
            </View>
        );
    }

    return (
        <Page>
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Library</Text>
                <TouchableOpacity
                    onPress={handleImport}
                    style={styles.importButton}
                >
                    <Feather name="download" size={18} color={colors.primary} />
                    <Text style={styles.importButtonText}>Import Wall</Text>
                </TouchableOpacity>
            </View>
            {library.length === 0
                ? (
                    <View style={styles.emptyContainer}>
                        <Feather
                            name="inbox"
                            size={60}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.emptyText}>
                            Your library is empty.
                        </Text>
                        <Text style={styles.emptySubText}>
                            Import a mtWall file, or go to the Home tab to add
                            an image to get started.
                        </Text>
                    </View>
                )
                : (
                    <FlatList
                        data={library}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        extraData={{ expandedImageId, library }}
                    />
                )}
        </Page>
    );
}

const getStyles = (colors) =>
    StyleSheet.create({
        loadingContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
        },
        loadingText: {
            marginTop: 10,
            fontSize: 16,
            color: colors.textSecondary,
        },
        pageHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        pageTitle: {
            fontSize: 24,
            fontWeight: "bold",
            color: colors.text,
        },
        importButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.accent,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
        },
        importButtonText: {
            color: colors.primary,
            fontWeight: "bold",
            fontSize: 14,
        },
        listContainer: { padding: 20, paddingBottom: 120 },
        libraryItem: {
            backgroundColor: colors.card,
            borderRadius: 12,
            marginBottom: 15,
            overflow: "hidden",
        },
        itemHeader: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
            paddingVertical: 10,
            gap: 10,
        },
        thumbnail: {
            width: 50,
            height: 50,
            borderRadius: 8,
            backgroundColor: colors.accent,
        },
        itemTitle: {
            flex: 1,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
        },
        actionIcon: { padding: 5 },
        detailsContainer: {
            padding: 15,
            paddingTop: 0,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        detailText: {
            paddingTop: 15,
            color: colors.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
        },
        coordSetItem: {
            marginTop: 15,
            padding: 15,
            backgroundColor: colors.background,
            borderRadius: 8,
        },
        coordSetHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
        },
        coordSetTitle: { fontSize: 14, fontWeight: "bold", color: colors.text },
        playButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.primary,
            padding: 12,
            borderRadius: 20,
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
        },
        playButtonText: { color: colors.primaryText, fontWeight: "bold" },
        createSetButton: {
            flexDirection: "row",
            alignItems: "center",
            borderColor: colors.primary,
            borderWidth: 1,
            padding: 10,
            borderRadius: 20,
            justifyContent: "center",
            gap: 8,
            marginTop: 10,
            flex: 1,
        },
        createSetButtonText: {
            color: colors.primary,
            fontWeight: "bold",
        },
        savedSetsContainer: {
            marginTop: 15,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 15,
        },
        savedSetsHeader: {
            fontSize: 14,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 10,
        },
        noSavedSetsText: {
            color: colors.textSecondary,
            fontStyle: "italic",
            textAlign: "center",
            paddingVertical: 10,
        },
        playRandomSavedButton: { backgroundColor: colors.success },
        savedSetItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            gap: 10,
        },
        savedSetPlayButton: {
            flexDirection: "row",
            alignItems: "center",
            borderColor: colors.primary,
            borderWidth: 1,
            padding: 10,
            borderRadius: 20,
            justifyContent: "center",
            gap: 8,
            flex: 1,
        },
        playButtonTextSaved: { color: colors.primary, fontWeight: "bold" },
        emptyContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
        },
        emptyText: {
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginTop: 20,
        },
        emptySubText: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 10,
        },
        separator: {
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 15,
        },
        addNewCoordSetButton: {
            flexDirection: "row",
            alignItems: "center",
            borderColor: colors.primary,
            borderWidth: 1.5,
            borderStyle: "dashed",
            padding: 12,
            borderRadius: 8,
            justifyContent: "center",
            gap: 8,
        },
        addNewCoordSetButtonText: {
            color: colors.primary,
            fontWeight: "bold",
        },
    });
