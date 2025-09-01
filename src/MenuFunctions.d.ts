declare namespace MenuFunctions {
    function cancelSelectedRides(force?: boolean): void;
    function importSelectedRoutes(autoconfirm?: boolean, force?: boolean): void;
    function linkSelectedRouteUrls(force?: boolean): void;
    function reinstateSelectedRides(force?: boolean): void;
    function scheduleSelectedRides(force?: boolean): void;
    function unscheduleSelectedRides(force?: boolean): void;
    function updateRiderCount(force?: boolean): void;
    function updateSelectedRides(force?: boolean): void;
}

declare const MenuFunctions: {
    cancelSelectedRides: (force?: boolean) => void;
    importSelectedRoutes: (autoconfirm?: boolean, force?: boolean) => void;
    linkSelectedRouteUrls: (force?: boolean) => void;
    reinstateSelectedRides: (force?: boolean) => void;
    scheduleSelectedRides: (force?: boolean) => void;
    unscheduleSelectedRides: (force?: boolean) => void;
    updateRiderCount: (force?: boolean) => void;
    updateSelectedRides: (force?: boolean) => void;
};
