import Page from "@/components/ui/Page";
import { darkColors, lightColors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image as RNImage,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLibrary } from "@/context/LibraryContext";
import { CoordinateSet, LibraryItem } from "@/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { handlePlayRandomSavedSet, handleSelectWall } from "@/utils/library.ts";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const CustomModal = ({ visible, title, message, onClose, colors }) => {
    const styles = getStyles(colors, { top: 0, bottom: 0, left: 0, right: 0 });
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    style={styles.modalView}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>
                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>OK</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const SaveMarkSetModal = (
    { visible, defaultName, onSave, onCancel, colors },
) => {
    const [markSetName, setMarkSetName] = useState(defaultName);
    const styles = getStyles(colors, { top: 0, bottom: 0, left: 0, right: 0 });

    useEffect(() => {
        if (visible) {
            setMarkSetName(defaultName);
        }
    }, [visible, defaultName]);

    const handleSave = () => {
        if (markSetName.trim()) {
            onSave(markSetName.trim());
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onCancel}
            >
                <TouchableOpacity
                    style={styles.saveModalView}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.saveModalHeader}>
                        <Feather name="save" size={24} color={colors.primary} />
                        <Text style={styles.saveModalTitle}>Save Mark Set</Text>
                    </View>

                    <Text style={styles.saveModalMessage}>
                        Give your mark set a memorable name so you can find it
                        easily later.
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.saveTextInput}
                            value={markSetName}
                            onChangeText={setMarkSetName}
                            placeholder="Enter set name"
                            placeholderTextColor={colors.textSecondary}
                            autoFocus={true}
                            selectTextOnFocus={true}
                            maxLength={50}
                        />
                        <Text style={styles.characterCount}>
                            {markSetName.length}/50
                        </Text>
                    </View>

                    <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.modalButtonSecondary,
                            ]}
                            onPress={onCancel}
                        >
                            <Text style={styles.modalButtonSecondaryText}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.modalButtonPrimary,
                                !markSetName.trim() &&
                                styles.modalButtonDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={!markSetName.trim()}
                        >
                            <Feather
                                name="check"
                                size={16}
                                color={colors.primaryText}
                            />
                            <Text style={styles.modalButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default function HomeScreen() {
    const { theme } = useTheme();
    const colors = theme === "dark" ? darkColors : lightColors;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors, insets);

    const { library, addImage, addCoordinates, addSavedMarkSet } = useLibrary();
    const params = useLocalSearchParams<{
        imageId?: string;
        coordsId?: string;
        setId?: string;
        createSet?: string;
        createCoords?: string;
    }>();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [currentCoordsId, setCurrentCoordsId] = useState<string | null>(null);
    const [imageCoordinates, setImageCoordinates] = useState<
        { x: number; y: number }[]
    >([]);
    const [imageDimensions, setImageDimensions] = useState({
        width: 0,
        height: 0,
    });
    const [displayDimensions, setDisplayDimensions] = useState({
        width: 0,
        height: 0,
    });

    const [gamePhase, setGamePhase] = useState<
        "setup" | "memorize" | "guess" | "result" | "create" | "create_coords"
    >("setup");
    const [targetPointsIndices, setTargetPointsIndices] = useState<number[]>(
        [],
    );
    const [userGuessedIndices, setUserGuessedIndices] = useState(
        new Set<number>(),
    );
    const [indicesToSave, setIndicesToSave] = useState<number[]>([]);

    const [modalInfo, setModalInfo] = useState({
        visible: false,
        title: "",
        message: "",
    });

    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [saveModalDefaultName, setSaveModalDefaultName] = useState("");

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    useEffect(() => {
        if (params.imageId && library.length > 0) {
            const item = library.find((i) => i.id === params.imageId);
            if (!item) return;

            if (params.createCoords === "true") {
                loadForCoordCreation(item);
                router.setParams({
                    imageId: undefined,
                    createCoords: undefined,
                });
                return;
            }

            const coordsSet = item.coordinates.find((c) =>
                c.id === params.coordsId
            );
            if (!coordsSet) return;

            if (params.createSet === "true") {
                loadForCreation(item, coordsSet);
            } else {
                loadWallFromLibrary(item, coordsSet, params.setId);
            }

            router.setParams({
                imageId: undefined,
                coordsId: undefined,
                setId: undefined,
                createSet: undefined,
            });
        }
    }, [params, library]);

    const loadWallFromLibrary = (
        item: LibraryItem,
        coordsSet: CoordinateSet,
        setId?: string,
    ) => {
        resetEverything();
        setSelectedImage(item.imageUri);
        setSelectedImageId(item.id);
        setImageDimensions({ width: item.width, height: item.height });
        calculateDisplayDimensions(item.width, item.height);
        setImageCoordinates(coordsSet.coords);
        setCurrentCoordsId(coordsSet.id);

        if (setId) {
            const savedSet = coordsSet.savedMarkSets.find((s) =>
                s.id === setId
            );
            if (savedSet) {
                setTargetPointsIndices(savedSet.indices);
                setUserGuessedIndices(new Set());
                setGamePhase("memorize");
                return;
            }
        }
        startMemorizePhase(coordsSet.coords.length);
    };

    const loadForCreation = (item: LibraryItem, coordsSet: CoordinateSet) => {
        resetEverything();
        setSelectedImage(item.imageUri);
        setSelectedImageId(item.id);
        setImageDimensions({ width: item.width, height: item.height });
        calculateDisplayDimensions(item.width, item.height);
        setImageCoordinates(coordsSet.coords);
        setCurrentCoordsId(coordsSet.id);

        setTargetPointsIndices([]);
        setUserGuessedIndices(new Set<number>());
        setGamePhase("create");
    };

    const loadForCoordCreation = (item: LibraryItem) => {
        resetEverything();
        setSelectedImage(item.imageUri);
        setSelectedImageId(item.id);
        setImageDimensions({ width: item.width, height: item.height });
        calculateDisplayDimensions(item.width, item.height);
        setImageCoordinates([]);
        setCurrentCoordsId(null);
        setGamePhase("create_coords");
    };

    const showAlert = (title, message) =>
        setModalInfo({ visible: true, title, message });

    const resetEverything = () => {
        setSelectedImage(null);
        setSelectedImageId(null);
        setCurrentCoordsId(null);
        setImageCoordinates([]);
        resetGame();
    };

    const pickImage = async () => {
        try {
            await ImagePicker.requestMediaLibraryPermissionsAsync();
            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 1,
                legacy: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                const libraryItem = await addImage(
                    asset.uri,
                    asset.width,
                    asset.height,
                );

                if (libraryItem) {
                    if (libraryItem.coordinates.length > 0) {
                        showAlert(
                            "Image Exists",
                            "This image is already in your library. Loading it for you.",
                        );
                    }
                    resetEverything();
                    setSelectedImage(libraryItem.imageUri);
                    setSelectedImageId(libraryItem.id);
                    setImageDimensions({
                        width: libraryItem.width,
                        height: libraryItem.height,
                    });
                    calculateDisplayDimensions(
                        libraryItem.width,
                        libraryItem.height,
                    );
                    setGamePhase("create_coords");
                }
            }
        } catch (error) {
            showAlert(
                "Error",
                `Failed to pick image: ${error.message || "Unknown error"}`,
            );
        }
    };

    const calculateDisplayDimensions = (originalWidth, originalHeight) => {
        const aspectRatio = originalWidth / originalHeight;
        const maxDisplayWidth = screenWidth - 40;
        const maxDisplayHeight = screenHeight * 0.6;

        let displayWidth = maxDisplayWidth;
        let displayHeight = maxDisplayWidth / aspectRatio;

        if (displayHeight > maxDisplayHeight) {
            displayHeight = maxDisplayHeight;
            displayWidth = maxDisplayHeight * aspectRatio;
        }
        setDisplayDimensions({ width: displayWidth, height: displayHeight });

        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        savedTranslateX.value = 0;
        translateY.value = 0;
        savedTranslateY.value = 0;
    };

    const onImageLoad = (event) => {
        const { width, height } = event.nativeEvent.source;
        if (imageDimensions.width === 0) {
            setImageDimensions({ width, height });
            calculateDisplayDimensions(width, height);
        }
    };

    const resetGame = () => {
        setGamePhase("setup");
        setTargetPointsIndices([]);
        setUserGuessedIndices(new Set());
        setIndicesToSave([]);
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        savedTranslateX.value = 0;
        translateY.value = withSpring(0);
        savedTranslateY.value = 0;
    };

    const startMemorizePhase = (totalPointsOverride?: number) => {
        const totalPoints = totalPointsOverride ?? imageCoordinates.length;
        if (totalPoints < 2) return;
        const numTargets = Math.min(
            Math.max(2, Math.floor(totalPoints * 0.3)),
            8,
        );
        const indices = Array.from(Array(totalPoints).keys());
        const shuffled = indices.sort(() => 0.5 - Math.random());
        setTargetPointsIndices(shuffled.slice(0, numTargets));
        setUserGuessedIndices(new Set());
        setGamePhase("memorize");
    };

    const generateDefaultMarkSetName = (markCountOverride?: number) => {
        if (!selectedImageId || !currentCoordsId) return "Set of 0";

        const currentItem = library.find((item) => item.id === selectedImageId);
        if (!currentItem) return "Set of 0";

        const currentCoordSet = currentItem.coordinates.find((coords) =>
            coords.id === currentCoordsId
        );
        if (!currentCoordSet) return "Set of 0";

        const markCount = markCountOverride ?? targetPointsIndices.length;
        const baseName = `Set of ${markCount}`;

        const existingSets = currentCoordSet.savedMarkSets
            .map((set) => set.name)
            .filter((name) => name.startsWith(baseName));

        if (existingSets.length === 0) {
            return `${baseName} (1)`;
        }

        const existingNumbers = existingSets
            .map((name) => {
                const match = name.match(/\((\d+)\)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter((num) => num > 0);

        const nextNumber = existingNumbers.length > 0
            ? Math.max(...existingNumbers) + 1
            : 1;
        return `${baseName} (${nextNumber})`;
    };

    const handleSaveSet = (indices: number[]) => {
        if (
            !selectedImageId || !currentCoordsId ||
            indices.length === 0
        ) {
            showAlert(
                "Error",
                "Cannot save set. No active wall data or points found.",
            );
            return;
        }

        setIndicesToSave(indices);
        const defaultName = generateDefaultMarkSetName(indices.length);
        setSaveModalDefaultName(defaultName);
        setSaveModalVisible(true);
    };

    const handleSaveMarkSet = (name: string) => {
        try {
            if (indicesToSave.length === 0) {
                showAlert(
                    "Error",
                    "An unexpected error occurred while saving.",
                );
                console.error("Save attempt with no indices.");
                return;
            }
            addSavedMarkSet(selectedImageId!, currentCoordsId!, {
                name,
                indices: indicesToSave,
            });
            setSaveModalVisible(false);
            showAlert(
                "Success",
                `Set "${name}" saved to your library!`,
            );
            if (gamePhase === "create") {
                setUserGuessedIndices(new Set());
                setGamePhase("setup");
            }
        } catch (error) {
            console.error("Failed to save mark set:", error);
            showAlert(
                "Error",
                "An unexpected error occurred while saving.",
            );
        }
    };

    const handleSaveCoordinates = async () => {
        if (!selectedImageId || imageCoordinates.length < 2) {
            showAlert(
                "Error",
                "Cannot save. Image ID is missing or not enough points.",
            );
            return;
        }
        try {
            const newCoordSet = await addCoordinates(
                selectedImageId,
                imageCoordinates,
            );
            if (newCoordSet) {
                showAlert(
                    "Success",
                    `${imageCoordinates.length} coordinates saved as a new set!`,
                );
                setImageCoordinates(newCoordSet.coords);
                setCurrentCoordsId(newCoordSet.id);
                setGamePhase("setup");
            }
        } catch (error) {
            showAlert("Error", `Failed to save coordinates: ${error.message}`);
        }
    };

    const startGuessPhase = () => setGamePhase("guess");
    const showResults = () => {
        if (userGuessedIndices.size === 0) {
            showAlert(
                "No Guesses",
                "You haven't selected any points. Tap on the circles to make a guess!",
            );
            return;
        }
        setGamePhase("result");
    };

    const handleMarkerPress = (index: number) => {
        if (gamePhase === "guess" || gamePhase === "create") {
            const newGuessed = new Set(userGuessedIndices);
            newGuessed.has(index)
                ? newGuessed.delete(index)
                : newGuessed.add(index);
            setUserGuessedIndices(newGuessed);
        }
        if (gamePhase === "create_coords") {
            setImageCoordinates((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const handleImageTap = (event) => {
        const originalX = (event.x / displayDimensions.width) *
            imageDimensions.width;
        const originalY = (event.y / displayDimensions.height) *
            imageDimensions.height;

        if (
            originalX < 0 || originalX > imageDimensions.width ||
            originalY < 0 || originalY > imageDimensions.height
        ) {
            return;
        }

        setImageCoordinates((
            prev,
        ) => [...prev, { x: originalX, y: originalY }]);
    };

    const getMarkerColor = (index) => {
        if (gamePhase === "create_coords") {
            return colors.primary + "90";
        }
        if (gamePhase === "create") {
            const isSelected = userGuessedIndices.has(index);
            return isSelected
                ? colors.primary + "90"
                : "rgba(128, 128, 128, 0.2)";
        }
        const isTarget = targetPointsIndices.includes(index);
        const isGuessed = userGuessedIndices.has(index);
        if (gamePhase === "result") {
            if (isTarget && isGuessed) return colors.success + "90";
            if (!isTarget && isGuessed) return colors.error + "90";
            if (isTarget && !isGuessed) return colors.warning + "90";
        }
        if (gamePhase === "memorize" && isTarget) return colors.primary + "90";
        if (gamePhase === "guess" && isGuessed) return colors.primary + "90";
        return "rgba(128, 128, 128, 0.2)";
    };

    const getGameStatusText = () => {
        const selectionCount = userGuessedIndices.size;
        const count = imageCoordinates.length;
        switch (gamePhase) {
            case "setup":
                return selectedImage && imageCoordinates.length > 0
                    ? "Ready to play!"
                    : "Load an image to start";
            case "memorize":
                return `Memorize the ${targetPointsIndices.length} blue points!`;
            case "guess":
                return `Guess: ${userGuessedIndices.size} selected`;
            case "result":
                return "Results are in!";
            case "create_coords":
                return `Create Points: ${count} point${
                    count === 1 ? "" : "s"
                } placed`;
            case "create":
                return `Create Set: ${selectionCount} point${
                    selectionCount === 1 ? "" : "s"
                } selected`;
            default:
                return "";
        }
    };

    const panGesture = Gesture.Pan().onUpdate((event) => {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
    }).onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
    });
    const pinchGesture = Gesture.Pinch().onUpdate((event) => {
        scale.value = savedScale.value * event.scale;
    }).onEnd(() => {
        if (scale.value < 1) {
            scale.value = withSpring(1);
            savedScale.value = 1;
            translateX.value = withSpring(0);
            savedTranslateX.value = 0;
            translateY.value = withSpring(0);
            savedTranslateY.value = 0;
        } else savedScale.value = scale.value;
    });

    const imageTapGesture = Gesture.Tap().onEnd((event) => {
        if (gamePhase === "create_coords") {
            runOnJS(handleImageTap)(event);
        }
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, {
            translateY: translateY.value,
        }, { scale: scale.value }],
    }));

    const renderMarkers = () => {
        if (
            !selectedImage || imageCoordinates.length === 0 ||
            displayDimensions.width === 0
        ) return null;
        const scaleX = displayDimensions.width / imageDimensions.width;
        const scaleY = displayDimensions.height / imageDimensions.height;
        return imageCoordinates.map((coord, index) => {
            const markerTapGesture = Gesture.Tap().onEnd(() => {
                runOnJS(handleMarkerPress)(index);
            });
            return (
                <GestureDetector key={index} gesture={markerTapGesture}>
                    <Animated.View
                        style={[styles.markerCircle, {
                            left: (coord.x * scaleX) - 12,
                            top: (coord.y * scaleY) - 12,
                            backgroundColor: getMarkerColor(index),
                        }]}
                    />
                </GestureDetector>
            );
        });
    };

    const renderGameControls = () => {
        const canStartGame = selectedImage && imageCoordinates.length > 0;

        const getCurrentMarkSetInfo = () => {
            if (!selectedImageId || !currentCoordsId) return null;

            const currentItem = library.find((item) =>
                item.id === selectedImageId
            );
            if (!currentItem) return null;

            const currentCoordSet = currentItem.coordinates.find((coords) =>
                coords.id === currentCoordsId
            );
            if (!currentCoordSet) return null;

            if (targetPointsIndices.length > 0) {
                const targetIndicesSet = new Set(targetPointsIndices);
                const matchingSet = currentCoordSet.savedMarkSets.find(
                    (savedSet) =>
                        savedSet.indices.length === targetIndicesSet.size &&
                        savedSet.indices.every((idx) =>
                            targetIndicesSet.has(idx)
                        ),
                );
                return matchingSet || null;
            }

            return null;
        };

        const currentMarkSet = getCurrentMarkSetInfo();
        const isUnsavedSet = gamePhase !== "setup" && gamePhase !== "create" &&
            targetPointsIndices.length > 0 && !currentMarkSet;

        if (gamePhase === "result") {
            return (
                <View style={styles.gameControlsContainer}>
                    <TouchableOpacity
                        style={[styles.gameButton, styles.resultButton]}
                        onPress={() => {
                            setUserGuessedIndices(new Set());
                            setGamePhase("memorize");
                        }}
                    >
                        <Feather
                            name="rotate-ccw"
                            size={20}
                            color={colors.primaryText}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.gameButton, styles.resultButton]}
                        onPress={() => startMemorizePhase()}
                    >
                        <FontAwesome5
                            name="dice-three"
                            size={20}
                            color={colors.primaryText}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.gameButton,
                            styles.resultButton,
                        ]}
                        onPress={() => {
                            const currentItem = library.find(
                                (item) => item.id === selectedImageId,
                            );
                            if (!currentItem) return;

                            const currentCoordSet = currentItem.coordinates
                                .find(
                                    (coords) => coords.id === currentCoordsId,
                                );
                            if (!currentCoordSet) return;

                            handlePlayRandomSavedSet(
                                currentItem,
                                currentCoordSet,
                                router,
                            );
                        }}
                    >
                        <Feather
                            name="shuffle"
                            size={20}
                            color={colors.primaryText}
                        />
                    </TouchableOpacity>

                    <View style={styles.markSetInfoContainer}>
                        {currentMarkSet
                            ? (
                                <View style={styles.markSetInfo}>
                                    <Text
                                        style={styles.markSetName}
                                        numberOfLines={2}
                                    >
                                        {currentMarkSet.name}
                                    </Text>
                                    <Text style={styles.markSetDetails}>
                                        {currentMarkSet.indices.length} points
                                    </Text>
                                </View>
                            )
                            : isUnsavedSet
                            ? (
                                <View style={styles.markSetInfo}>
                                    <Text
                                        style={styles.markSetName}
                                    >
                                        Unsaved Set of{" "}
                                        {targetPointsIndices.length}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.saveMarkSetButton}
                                        onPress={() =>
                                            handleSaveSet(targetPointsIndices)}
                                    >
                                        <Feather
                                            name="save"
                                            size={16}
                                            color={colors.primary}
                                        />
                                        <Text
                                            style={styles.saveMarkSetButtonText}
                                        >
                                            Save
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )
                            : null}
                    </View>
                </View>
            );
        }

        const controls = {
            setup: {
                onPress: () => startMemorizePhase(),
                icon: "play",
                text: "Start",
                disabled: !canStartGame,
            },
            memorize: {
                onPress: startGuessPhase,
                icon: "check",
                text: "Ready",
            },
            guess: {
                onPress: showResults,
                icon: "check-square",
                text: "Check",
                disabled: userGuessedIndices.size === 0,
            },
            create_coords: {
                onPress: handleSaveCoordinates,
                icon: "save",
                text: "Save Coordinates",
                disabled: imageCoordinates.length < 2,
            },
            create: {
                onPress: () => {
                    if (userGuessedIndices.size < 2) {
                        showAlert(
                            "Not Enough Points",
                            "Please select at least 2 points to create a set.",
                        );
                        return;
                    }
                    const selectedIndices = Array.from(userGuessedIndices);
                    handleSaveSet(selectedIndices);
                },
                icon: "save",
                text: "Save Mark Set",
                disabled: userGuessedIndices.size < 2,
            },
        };

        const control = controls[gamePhase];
        if (!control) return null;

        return (
            <View style={styles.gameControlsContainer}>
                <View style={styles.mainActionsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.gameButton,
                            control.disabled && styles.gameButtonDisabled,
                        ]}
                        onPress={control.onPress}
                        disabled={control.disabled}
                    >
                        <Feather
                            name={control.icon}
                            size={20}
                            color={colors.primaryText}
                        />
                        <Text style={styles.gameButtonText}>
                            {control.text}
                        </Text>
                    </TouchableOpacity>
                    {gamePhase === "setup" && (
                        <TouchableOpacity
                            style={styles.libraryButton}
                            onPress={() => router.push("/library")}
                        >
                            <Feather
                                name="layers"
                                size={22}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.markSetInfoContainer}>
                    {currentMarkSet
                        ? (
                            <View style={styles.markSetInfo}>
                                <Text
                                    style={styles.markSetName}
                                    numberOfLines={2}
                                >
                                    {currentMarkSet.name}
                                </Text>
                                <Text style={styles.markSetDetails}>
                                    {currentMarkSet.indices.length} points
                                </Text>
                            </View>
                        )
                        : isUnsavedSet
                        ? (
                            <View style={styles.markSetInfo}>
                                <Text
                                    style={styles.markSetName}
                                >
                                    Unsaved Set of {targetPointsIndices.length}
                                </Text>
                                <TouchableOpacity
                                    style={styles.saveMarkSetButton}
                                    onPress={() =>
                                        handleSaveSet(targetPointsIndices)}
                                >
                                    <Feather
                                        name="save"
                                        size={16}
                                        color={colors.primary}
                                    />
                                    <Text style={styles.saveMarkSetButtonText}>
                                        Save
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )
                        : gamePhase === "create" && userGuessedIndices.size > 0
                        ? (
                            <View style={styles.markSetInfo}>
                                <Text
                                    style={styles.markSetName}
                                    numberOfLines={2}
                                >
                                    New Set
                                </Text>
                                <Text style={styles.markSetDetails}>
                                    {userGuessedIndices.size} points selected
                                </Text>
                            </View>
                        )
                        : null}
                </View>
            </View>
        );
    };

    const renderScoreCard = () => {
        if (gamePhase !== "result") return null;
        const correct =
            targetPointsIndices.filter((idx) => userGuessedIndices.has(idx))
                .length;
        const totalTargets = targetPointsIndices.length;
        const incorrect = userGuessedIndices.size - correct;
        const missed = totalTargets - correct;
        return (
            <View style={styles.scoreCard}>
                <View style={styles.scoreItem}>
                    <Feather
                        name="check-circle"
                        size={24}
                        color={colors.success}
                    />
                    <Text style={styles.scoreText}>{correct} Correct</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Feather name="x-circle" size={24} color={colors.error} />
                    <Text style={styles.scoreText}>{incorrect} Wrong</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Feather
                        name="alert-circle"
                        size={24}
                        color={colors.warning}
                    />
                    <Text style={styles.scoreText}>{missed} Missed</Text>
                </View>
            </View>
        );
    };

    return (
        <>
            <CustomModal
                visible={modalInfo.visible}
                title={modalInfo.title}
                message={modalInfo.message}
                onClose={() =>
                    setModalInfo((prev) => ({ ...prev, visible: false }))}
                colors={colors}
            />
            <SaveMarkSetModal
                visible={saveModalVisible}
                defaultName={saveModalDefaultName}
                onSave={handleSaveMarkSet}
                onCancel={() => setSaveModalVisible(false)}
                colors={colors}
            />
            <Page>
                <View style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={pickImage}
                        >
                            <Feather
                                name="image"
                                size={24}
                                color={selectedImage
                                    ? colors.primary
                                    : colors.textSecondary}
                            />
                        </TouchableOpacity>
                        <View style={styles.headerStatus}>
                            <Text style={styles.statusText}>
                                {getGameStatusText()}
                            </Text>
                            {(imageCoordinates.length > 0 &&
                                (gamePhase === "setup" ||
                                    gamePhase === "create")) && (
                                <Text style={styles.coordinatesCount}>
                                    {imageCoordinates.length} points loaded
                                </Text>
                            )}
                            {gamePhase === "create_coords" &&
                                selectedImage && (
                                <Text style={styles.coordinatesCount}>
                                    Tap on the image to add points
                                </Text>
                            )}
                        </View>
                        {selectedImage && gamePhase !== "setup" && (
                            <TouchableOpacity
                                style={styles.exitButton}
                                onPress={resetGame}
                            >
                                <Feather
                                    name="x"
                                    size={24}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.contentContainer}>
                        {selectedImage
                            ? (
                                <GestureDetector
                                    gesture={Gesture.Simultaneous(
                                        panGesture,
                                        pinchGesture,
                                        imageTapGesture,
                                    )}
                                >
                                    <Animated.View
                                        style={[
                                            styles.imageWrapper,
                                            displayDimensions,
                                            animatedStyle,
                                        ]}
                                    >
                                        <RNImage
                                            source={{ uri: selectedImage }}
                                            style={styles.image}
                                            onLoad={onImageLoad}
                                            resizeMode="contain"
                                        />
                                        {renderMarkers()}
                                    </Animated.View>
                                </GestureDetector>
                            )
                            : (
                                <View style={styles.placeholder}>
                                    <Feather
                                        name="image"
                                        size={80}
                                        color={colors.textSecondary}
                                    />
                                    <Text style={styles.placeholderSubText}>
                                        Select an image to begin
                                    </Text>
                                </View>
                            )}
                    </View>
                </View>
                <View style={styles.footer}>
                    {renderScoreCard()}
                    {renderGameControls()}
                </View>
            </Page>
        </>
    );
}
const getStyles = (colors, insets) => {
    return StyleSheet.create({
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 10,
            marginTop: -insets.top,
            paddingTop: 10 + insets.top,
            gap: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
            elevation: 2,
            zIndex: 2,
        },
        exitButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.accent,
            marginLeft: "auto",
        },
        contentContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 15,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
            gap: 15,
        },
        iconButton: {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.accent,
            justifyContent: "center",
            alignItems: "center",
        },
        headerStatus: { flex: 1 },
        statusText: { fontSize: 16, fontWeight: "600", color: colors.text },
        coordinatesCount: { fontSize: 12, color: colors.textSecondary },
        gameButton: {
            backgroundColor: colors.primary,
            paddingVertical: 15,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            flexGrow: 1,
        },
        gameButtonDisabled: { backgroundColor: colors.disabled },
        gameButtonText: {
            color: colors.primaryText,
            fontSize: 14,
            fontWeight: "bold",
        },
        libraryButton: {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.accent,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
        },
        resultButton: {
            flex: 2,
        },
        saveButton: {
            borderColor: colors.primary,
            borderWidth: 2,
            paddingVertical: 13,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 20,
            flex: 1,
        },
        saveButtonText: {
            color: colors.primary,
            fontSize: 16,
            fontWeight: "bold",
        },
        placeholder: {
            justifyContent: "center",
            alignItems: "center",
            opacity: 0.6,
        },
        placeholderSubText: {
            fontSize: 16,
            color: colors.textSecondary,
            marginTop: 10,
        },
        imageWrapper: {
            position: "relative",
            borderRadius: 15,
            overflow: "hidden",
            backgroundColor: colors.accent,
            alignSelf: "center",
            justifyContent: "center",
            alignItems: "center",
        },
        image: { width: "100%", height: "100%" },
        markerCircle: {
            position: "absolute",
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.8)",
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
        },
        scoreCard: {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
        },
        scoreItem: { alignItems: "center", gap: 4 },
        scoreText: { color: colors.text, fontSize: 14, fontWeight: "500" },
        modalOverlay: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
        },
        modalView: {
            margin: 20,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 35,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            width: "85%",
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 15,
            textAlign: "center",
            color: colors.text,
        },
        modalMessage: {
            fontSize: 16,
            marginBottom: 25,
            textAlign: "center",
            lineHeight: 22,
            color: colors.textSecondary,
        },
        modalButton: {
            borderRadius: 20,
            paddingVertical: 10,
            paddingHorizontal: 20,
            elevation: 2,
            minWidth: 100,
            alignItems: "center",
            justifyContent: "center",
        },
        modalButtonText: {
            color: colors.primaryText,
            fontWeight: "bold",
            textAlign: "center",
            fontSize: 16,
        },
        saveModalView: {
            margin: 20,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 30,
            alignItems: "stretch",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            width: "90%",
            maxWidth: 400,
        },
        saveModalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 15,
            gap: 10,
        },
        saveModalTitle: {
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
        },
        saveModalMessage: {
            fontSize: 16,
            textAlign: "center",
            lineHeight: 22,
            color: colors.textSecondary,
            marginBottom: 25,
        },
        inputContainer: {
            marginBottom: 25,
        },
        saveTextInput: {
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 15,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.background,
            marginBottom: 8,
        },
        characterCount: {
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "right",
            marginRight: 5,
        },
        modalButtonContainer: {
            flexDirection: "row",
            gap: 12,
        },
        modalButtonSecondary: {
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: colors.border,
            flex: 1,
        },
        modalButtonSecondaryText: {
            color: colors.text,
            fontWeight: "bold",
            textAlign: "center",
            fontSize: 16,
        },
        modalButtonPrimary: {
            backgroundColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flex: 1,
        },
        modalButtonDisabled: {
            backgroundColor: colors.disabled,
            opacity: 0.6,
        },
        gameControlsContainer: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        mainActionsContainer: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 3,
        },
        markSetInfoContainer: {
            flex: 3,
            justifyContent: "center",
            minHeight: 50,
        },
        markSetInfo: {
            alignItems: "flex-start",
            paddingLeft: 10,
        },
        markSetName: {
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 2,
        },
        markSetDetails: {
            fontSize: 12,
            color: colors.textSecondary,
            marginBottom: 4,
        },
        saveMarkSetButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.accent,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            gap: 4,
        },
        saveMarkSetButtonText: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: "600",
        },
    });
};
