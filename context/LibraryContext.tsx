import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import {
    CoordinateSet,
    ExportedLibraryItem,
    LibraryItem,
    SavedMarkSet,
} from "@/types";

const LIBRARY_STORAGE_KEY = "memorize_that_wall_library";

interface LibraryContextType {
    library: LibraryItem[];
    isLoading: boolean;
    addImage: (
        uri: string,
        width: number,
        height: number,
    ) => Promise<LibraryItem | null>;
    addCoordinates: (
        imageId: string,
        coords: { x: number; y: number }[],
    ) => Promise<CoordinateSet | null>;
    addSavedMarkSet: (
        imageId: string,
        coordsId: string,
        markSetData: Omit<SavedMarkSet, "id">,
    ) => void;
    deleteImage: (imageId: string) => Promise<void>;
    deleteCoordinates: (imageId: string, coordsId: string) => Promise<void>;
    deleteSavedMarkSet: (
        imageId: string,
        coordsId: string,
        setId: string,
    ) => Promise<void>;
    importLibraryItem: (data: any) => Promise<LibraryItem | { error: string }>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
    const [library, setLibrary] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isMounted = useRef(false);

    useEffect(() => {
        const loadLibrary = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem(
                    LIBRARY_STORAGE_KEY,
                );
                if (jsonValue) {
                    setLibrary(JSON.parse(jsonValue));
                }
            } catch (e) {
                console.error("Failed to load library from storage", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadLibrary();
    }, []);

    useEffect(() => {
        if (isMounted.current) {
            const saveLibrary = async () => {
                try {
                    const jsonValue = JSON.stringify(library);
                    await AsyncStorage.setItem(LIBRARY_STORAGE_KEY, jsonValue);
                    console.log("Library saved successfully.");
                } catch (e) {
                    console.error("Failed to save library to storage", e);
                }
            };
            saveLibrary();
        } else {
            isMounted.current = true;
        }
    }, [library]);

    const addImage = async (
        uri: string,
        width: number,
        height: number,
    ): Promise<LibraryItem | null> => {
        try {
            const fileBase64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const hash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                fileBase64,
            );

            const existingItem = library.find((item) =>
                item.contentHash === hash
            );
            if (existingItem) {
                console.log(
                    "Duplicate image detected, returning existing item.",
                );
                return existingItem;
            }

            const filename = uri.split("/").pop() || `img_${Date.now()}`;
            const newUri = `${FileSystem.documentDirectory}${filename}`;

            const fileInfo = await FileSystem.getInfoAsync(newUri);
            if (fileInfo.exists) {
                const uniqueFilename = `${Date.now()}_${filename}`;
                const uniqueUri =
                    `${FileSystem.documentDirectory}${uniqueFilename}`;
                await FileSystem.copyAsync({ from: uri, to: uniqueUri });
                const newItem: LibraryItem = {
                    id: uniqueUri,
                    imageUri: uniqueUri,
                    originalUri: uri,
                    contentHash: hash,
                    width,
                    height,
                    coordinates: [],
                };
                setLibrary((currentLibrary) => [...currentLibrary, newItem]);
                return newItem;
            }

            await FileSystem.copyAsync({ from: uri, to: newUri });

            const newItem: LibraryItem = {
                id: newUri,
                imageUri: newUri,
                originalUri: uri,
                contentHash: hash,
                width,
                height,
                coordinates: [],
            };

            setLibrary((currentLibrary) => [...currentLibrary, newItem]);
            return newItem;
        } catch (error) {
            console.error("Failed to add image to library:", error);
            return null;
        }
    };

    const addCoordinates = async (
        imageId: string,
        coords: { x: number; y: number }[],
    ): Promise<CoordinateSet | null> => {
        try {
            const coordsString = JSON.stringify(coords);
            const coordsHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                coordsString,
            );

            let resultCoordSet: CoordinateSet | null = null;

            setLibrary((currentLibrary) => {
                const imageItemIndex = currentLibrary.findIndex((item) =>
                    item.id === imageId
                );
                if (imageItemIndex === -1) {
                    resultCoordSet = null;
                    return currentLibrary;
                }

                const imageItem = currentLibrary[imageItemIndex];
                const existingCoords = imageItem.coordinates.find(
                    (c) => c.id === coordsHash,
                );

                if (existingCoords) {
                    resultCoordSet = existingCoords;
                    return currentLibrary;
                }

                const newCoordSet: CoordinateSet = {
                    id: coordsHash,
                    coords,
                    savedMarkSets: [],
                };
                resultCoordSet = newCoordSet;

                const newImageItem = {
                    ...imageItem,
                    coordinates: [...imageItem.coordinates, newCoordSet],
                };

                const newLibrary = [...currentLibrary];
                newLibrary[imageItemIndex] = newImageItem;

                return newLibrary;
            });

            return resultCoordSet;
        } catch (error) {
            console.error("Failed to add coordinates:", error);
            return null;
        }
    };

    const addSavedMarkSet = (
        imageId: string,
        coordsId: string,
        markSetData: Omit<SavedMarkSet, "id">,
    ) => {
        const newMarkSet: SavedMarkSet = {
            ...markSetData,
            id: Date.now().toString() + Math.random().toString(),
        };

        setLibrary((currentLibrary) => {
            return currentLibrary.map((item) => {
                if (item.id === imageId) {
                    return {
                        ...item,
                        coordinates: item.coordinates.map((coordSet) => {
                            if (coordSet.id === coordsId) {
                                const existingSet = coordSet.savedMarkSets.find(
                                    (s) => s.name === newMarkSet.name,
                                );
                                if (existingSet) return coordSet;

                                return {
                                    ...coordSet,
                                    savedMarkSets: [
                                        ...coordSet.savedMarkSets,
                                        newMarkSet,
                                    ],
                                };
                            }
                            return coordSet;
                        }),
                    };
                }
                return item;
            });
        });
    };

    const deleteImage = async (imageId: string) => {
        const itemToDelete = library.find((item) => item.id === imageId);
        if (itemToDelete) {
            await FileSystem.deleteAsync(itemToDelete.imageUri, {
                idempotent: true,
            });
        }
        setLibrary((lib) => lib.filter((item) => item.id !== imageId));
    };

    const deleteCoordinates = async (imageId: string, coordsId: string) => {
        setLibrary((lib) =>
            lib.map((item) => {
                if (item.id === imageId) {
                    return {
                        ...item,
                        coordinates: item.coordinates.filter(
                            (c) => c.id !== coordsId,
                        ),
                    };
                }
                return item;
            })
        );
    };

    const deleteSavedMarkSet = async (
        imageId: string,
        coordsId: string,
        setId: string,
    ) => {
        setLibrary((lib) =>
            lib.map((item) => {
                if (item.id === imageId) {
                    return {
                        ...item,
                        coordinates: item.coordinates.map((c) => {
                            if (c.id === coordsId) {
                                return {
                                    ...c,
                                    savedMarkSets: c.savedMarkSets.filter(
                                        (s) => s.id !== setId,
                                    ),
                                };
                            }
                            return c;
                        }),
                    };
                }
                return item;
            })
        );
    };

    const importLibraryItem = async (
        data: any,
    ): Promise<LibraryItem | { error: string }> => {
        const expectedKeys: (keyof ExportedLibraryItem)[] = [
            "version",
            "imageData",
            "imageFileName",
            "width",
            "height",
            "coordinates",
        ];
        if (
            !data || expectedKeys.some((key) => !(key in data)) ||
            data.version !== 1
        ) {
            return { error: "Invalid or unsupported file format." };
        }

        try {
            const tempImageUri = FileSystem.cacheDirectory +
                `import_${Date.now()}_${data.imageFileName}`;
            await FileSystem.writeAsStringAsync(tempImageUri, data.imageData, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const fileBase64 = await FileSystem.readAsStringAsync(
                tempImageUri,
                {
                    encoding: FileSystem.EncodingType.Base64,
                },
            );
            const imageHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                fileBase64,
            );

            let targetLibraryItem: LibraryItem | null = null;

            const existingItem = library.find((item) =>
                item.contentHash === imageHash
            );
            if (existingItem) {
                targetLibraryItem = existingItem;
                await FileSystem.deleteAsync(tempImageUri, {
                    idempotent: true,
                });
            } else {
                targetLibraryItem = await addImage(
                    tempImageUri,
                    data.width,
                    data.height,
                );
                await FileSystem.deleteAsync(tempImageUri, {
                    idempotent: true,
                });
            }

            if (!targetLibraryItem) {
                return { error: "Failed to process and save the image." };
            }

            for (const coordData of data.coordinates) {
                const coordsString = JSON.stringify(coordData.coords);
                const coordsHash = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    coordsString,
                );

                setLibrary((currentLibrary) => {
                    return currentLibrary.map((item) => {
                        if (item.id === targetLibraryItem!.id) {
                            let existingCoordSet = item.coordinates.find(
                                (c) => c.id === coordsHash,
                            );

                            if (!existingCoordSet) {
                                existingCoordSet = {
                                    id: coordsHash,
                                    coords: coordData.coords,
                                    savedMarkSets: [],
                                };
                                item = {
                                    ...item,
                                    coordinates: [
                                        ...item.coordinates,
                                        existingCoordSet,
                                    ],
                                };
                            }

                            if (coordData.savedMarkSets) {
                                const newMarkSets = coordData.savedMarkSets
                                    .filter(
                                        (newMarkSet) =>
                                            !existingCoordSet!.savedMarkSets
                                                .some(
                                                    (existing) =>
                                                        existing.name ===
                                                            newMarkSet.name,
                                                ),
                                    ).map((markSetData) => ({
                                        ...markSetData,
                                        id: Date.now().toString() +
                                            Math.random().toString(),
                                    }));

                                if (newMarkSets.length > 0) {
                                    item = {
                                        ...item,
                                        coordinates: item.coordinates.map(
                                            (coordSet) => {
                                                if (
                                                    coordSet.id === coordsHash
                                                ) {
                                                    return {
                                                        ...coordSet,
                                                        savedMarkSets: [
                                                            ...coordSet
                                                                .savedMarkSets,
                                                            ...newMarkSets,
                                                        ],
                                                    };
                                                }
                                                return coordSet;
                                            },
                                        ),
                                    };
                                }
                            }
                        }
                        return item;
                    });
                });
            }

            return targetLibraryItem;
        } catch (e) {
            console.error("Error during import:", e);
            return { error: "An unexpected error occurred during import." };
        }
    };

    return (
        <LibraryContext.Provider
            value={{
                library,
                isLoading,
                addImage,
                addCoordinates,
                addSavedMarkSet,
                deleteImage,
                deleteCoordinates,
                deleteSavedMarkSet,
                importLibraryItem,
            }}
        >
            {children}
        </LibraryContext.Provider>
    );
};

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (context === undefined) {
        throw new Error("useLibrary must be used within a LibraryProvider");
    }
    return context;
};
