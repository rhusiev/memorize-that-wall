import { Router } from "expo-router";
import { CoordinateSet, LibraryItem } from "@/types";

export const handleSelectWall = (
    item: LibraryItem,
    coordSet: CoordinateSet,
    router: Router,
    setId?: string,
) => {
    const params: any = { imageId: item.id, coordsId: coordSet.id };
    if (setId) {
        params.setId = setId;
    }
    router.push({ pathname: "/", params });
};

export const handlePlayRandomSavedSet = (
    item: LibraryItem,
    coordSet: CoordinateSet,
    router: Router,
) => {
    if (coordSet.savedMarkSets.length === 0) return;
    const randomIndex = Math.floor(
        Math.random() * coordSet.savedMarkSets.length,
    );
    const randomSet = coordSet.savedMarkSets[randomIndex];
    handleSelectWall(item, coordSet, router, randomSet.id);
};
